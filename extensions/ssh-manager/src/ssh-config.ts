import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  fchmodSync,
  globSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ISSHConnection } from "./types";

const fields = {
  hostname: ["address", "HostName"],
  user: ["user", "User"],
  port: ["port", "Port"],
  identityfile: ["sshKey", "IdentityFile"],
  remotecommand: ["command", "RemoteCommand"],
} as const;

type Field = keyof typeof fields;
type ConfigBlock = {
  file: string;
  start: number;
  end: number;
  patterns: string[];
  directives: Map<string, string[]>;
  icon?: string;
};

const tokenizedDirectives = new Set(["host", "include", "match", "hostname", "user", "port", "identityfile"]);
// Match Unicode emoji sequences and bare pictographs used in existing comments.
const singleEmoji = new RegExp("^(?:\\p{RGI_Emoji}|[\\p{Emoji}&&\\p{Extended_Pictographic}])$", "v");

export const defaultConfigFile = join(homedir(), ".ssh", "config");

export function configCommand(item: ISSHConnection) {
  const configFile = item.config?.file;
  if (!configFile) return undefined;
  const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
  const customConfig = configFile === defaultConfigFile ? "" : ` -F ${quote(configFile)}`;
  return `/usr/bin/ssh${customConfig} -- ${quote(item.name)}`;
}

function isMissing(error: unknown) {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

function readUtf8(file: string) {
  const bytes = readFileSync(file);
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("An SSH config file is not UTF-8. Open it in a text editor to preserve its encoding.");
  }
}

function fingerprint(block: ConfigBlock, text: string) {
  return createHash("sha256").update(block.file).update("\0").update(text.slice(block.start, block.end)).digest("hex");
}

function parseLine(line: string) {
  const match = /^[ \t]*([a-z][a-z0-9]*)[ \t]*(?:=[ \t]*|[ \t]+)([^\r\n]*)/i.exec(line);
  if (!match) return;
  const name = match[1].toLowerCase();
  const raw = match[2].trim();
  // Shell command values are opaque. A Match preview only needs its first criterion and value.
  if (!tokenizedDirectives.has(name) || (name === "match" && !/^(?:host|originalhost)(?:\s|$)/i.test(raw))) {
    return { name, values: [], raw };
  }
  const limit = name === "match" ? 2 : Infinity;
  const values: string[] = [];
  let value = "";
  let quote = "";
  let started = false;
  for (let index = 0; index < match[2].length; index++) {
    const character = match[2][index];
    if (character === "#" && !quote && !started) break;
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? "" : character;
    } else if (character === "\\" && /["'\\\s]/.test(match[2][index + 1] ?? "")) {
      value += match[2][++index];
    } else if (!quote && /\s/.test(character)) {
      if (started) values.push(value);
      value = "";
      started = false;
      if (values.length === limit) break;
      continue;
    } else {
      value += character;
    }
    started = true;
  }
  if (quote) throw new Error("An SSH config argument is missing a closing quote.");
  if (started) values.push(value);
  return { name, values, raw };
}

function literalAlias(value: string) {
  return Boolean(value) && !value.startsWith("-") && !/[\s!*?#"\\@:=[\]]/.test(value) && !containsControl(value);
}

function containsControl(value: string) {
  return Array.from(value, (character) => character.charCodeAt(0)).some((code) => code < 32 || code === 127);
}

function includeFiles(value: string, home: string) {
  const expanded = value.replace(/^~(?=\/|$)/, home);
  const pattern = isAbsolute(expanded) ? expanded : join(home, ".ssh", expanded);
  return globSync(pattern, { withFileTypes: true })
    .filter((entry) => entry.isFile() || entry.isSymbolicLink())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function scanConfig(configFile: string, home: string) {
  const files = new Map<string, string>();
  const hosts: ConfigBlock[] = [];
  const rules: { patterns: string[]; originalHost: boolean; hostname?: string }[] = [];
  let hasMatch = false;
  let totalBytes = 0;
  let root = resolve(configFile);

  function read(file: string, depth: number) {
    if (depth > 16) throw new Error("SSH config Includes are nested too deeply.");
    let realFile: string;
    let text: string;
    try {
      realFile = realpathSync(file);
      if (files.has(realFile)) return;
      if (files.size >= 256) throw new Error("SSH config references too many files.");
      const stat = statSync(realFile);
      if (!stat.isFile() || stat.size > 2 * 1024 * 1024) {
        throw new Error("An SSH config source is not a regular file or exceeds 2 MiB.");
      }
      totalBytes += stat.size;
      if (totalBytes > 8 * 1024 * 1024) throw new Error("The SSH config and its Includes exceed 8 MiB.");
      text = readUtf8(realFile);
    } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
    if (depth === 0) root = realFile;
    files.set(realFile, text);
    let block: ConfigBlock | undefined;
    let rule: (typeof rules)[number] | undefined;
    let offset = 0;

    for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
      const directive = parseLine(line);
      const icon = /^[ \t]*#SSHManagerIcon[ \t]+(\S+)[ \t]*\r?\n?$/.exec(line)?.[1];
      if (block && icon) block.icon = emojiIcon(icon);
      if (directive?.name === "host" || directive?.name === "match") {
        if (block) block.end = offset;
        block = undefined;
        rule = undefined;
        if (directive.name === "host") {
          block = {
            file: realFile,
            start: offset,
            end: text.length,
            patterns: directive.values,
            directives: new Map(),
          };
          hosts.push(block);
        } else {
          hasMatch = true;
          const criterion = directive.values[0]?.toLowerCase();
          if ((criterion === "host" || criterion === "originalhost") && directive.values[1]) {
            rule = { patterns: directive.values[1].split(","), originalHost: criterion === "originalhost" };
            rules.push(rule);
          }
        }
      } else if (directive) {
        if (block) {
          const entries = block.directives.get(directive.name) ?? [];
          entries.push(directive.name === "remotecommand" ? directive.raw : directive.values.join(" "));
          block.directives.set(directive.name, entries);
        }
        if (rule && directive.name === "hostname" && !rule.hostname) rule.hostname = directive.values[0];
        if (directive.name === "include") {
          for (const pattern of directive.values) {
            for (const included of includeFiles(pattern, home)) read(included, depth + 1);
          }
        }
      }
      offset += line.length;
    }
  }

  read(root, 0);
  return { root, text: files.get(root) ?? "", files, hosts, rules, hasMatch };
}

function aliasMatches(block: ConfigBlock, alias: string) {
  return block.patterns.some((pattern) => pattern.toLowerCase() === alias.toLowerCase());
}

function editable(block: ConfigBlock, root: string) {
  return (
    block.file === root &&
    block.patterns.length === 1 &&
    !block.directives.has("include") &&
    Object.keys(fields).every((field) => (block.directives.get(field)?.length ?? 0) <= 1)
  );
}

function emojiIcon(value: string) {
  return singleEmoji.test(value) ? value : undefined;
}

export function readConfigConnections(configFile: string, home = homedir()): ISSHConnection[] {
  const { root, files, hosts, rules, hasMatch } = scanConfig(configFile, home);
  const connections = new Map<string, ISSHConnection>();
  for (const block of hosts) {
    for (const alias of block.patterns.filter(literalAlias)) {
      const id = alias.toLowerCase();
      const previous = connections.get(id);
      if (previous) {
        if (previous.config) previous.config.editable = false;
        continue;
      }
      const connection: ISSHConnection = {
        id,
        name: alias,
        address: "",
        config: {
          file: configFile,
          editable: editable(block, root),
          conditional: hasMatch,
          fingerprint: fingerprint(block, files.get(block.file) ?? ""),
          icon: block.icon,
        },
      };
      for (const [name, [key]] of Object.entries(fields)) {
        connection[key] = block.directives.get(name)?.[0] ?? "";
      }
      const routes = rules.flatMap(({ patterns, originalHost, hostname }) => {
        const names = originalHost ? [id] : [id, connection.address.toLowerCase()];
        return hostname && patterns.some((pattern) => names.includes(pattern.toLowerCase())) ? [hostname] : [];
      });
      if (connection.config && routes.length) connection.config.routes = [...new Set(routes)];
      connections.set(id, connection);
    }
  }
  return [...connections.values()];
}

function readWriteTarget(file: string) {
  try {
    const stat = lstatSync(file);
    if (!stat.isFile()) throw new Error("The SSH config target changed. Refresh the list and try again.");
    return { text: readUtf8(file), mode: stat.mode & 0o777, inode: stat.ino, device: stat.dev };
  } catch (error) {
    if (!isMissing(error)) throw error;
    return { text: "", mode: 0o600, inode: undefined, device: undefined };
  }
}

function writeConfig(file: string, expected: string, content: string) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const before = readWriteTarget(file);
  if (before.text !== expected) throw new Error("The SSH config changed. Refresh the list and try again.");
  const temporary = join(dirname(file), `.raycast-ssh-${randomUUID()}`);
  const fd = openSync(temporary, "wx", before.mode);
  try {
    try {
      writeFileSync(fd, content);
      fchmodSync(fd, before.mode);
    } finally {
      closeSync(fd);
    }
    const current = readWriteTarget(file);
    if (
      current.text !== expected ||
      current.inode !== before.inode ||
      current.device !== before.device ||
      current.mode !== before.mode
    ) {
      throw new Error("The SSH config changed. Refresh the list and try again.");
    }
    renameSync(temporary, file);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // Keep the original write error if the temporary file could not be removed.
    }
    throw error;
  }
}

function configValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function configDirective(key: (typeof fields)[Field][0], label: string, value: string, eol: string) {
  return `  ${label} ${key === "command" ? value : configValue(value)}${eol}`;
}

export function changeConfigConnection(
  configFile: string,
  original: ISSHConnection | undefined,
  updated: ISSHConnection | undefined,
  home = homedir(),
) {
  const { root, text, hosts, hasMatch } = scanConfig(configFile, home);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const matches = original ? hosts.filter((block) => aliasMatches(block, original.name)) : [];
  const block = matches[0];

  if (original && (original.config?.file !== configFile || matches.length !== 1 || !editable(block, root))) {
    throw new Error("Edit this shared, included, or changed Host block in a text editor.");
  }
  if (original && hasMatch && updated?.name !== original.name) {
    throw new Error("Rename or remove aliases in a text editor when the configuration contains Match rules.");
  }
  if (original && original.config?.fingerprint !== fingerprint(block, text)) {
    throw new Error("The SSH config changed. Refresh the list and try again.");
  }
  if (!updated) {
    const retained = (text.slice(block.start, block.end).match(/[^\n]*\n|[^\n]+$/g) ?? [])
      .slice(1)
      .filter((line) => /^[ \t]*(?:#|\r?$)/.test(line) && !/^\s*#SSHManagerIcon\b/i.test(line))
      .join("");
    writeConfig(root, text, text.slice(0, block.start) + retained + text.slice(block.end));
    return;
  }

  if (!literalAlias(updated.name)) throw new Error("Enter a single valid SSH alias.");
  if (hosts.some((entry) => entry !== block && aliasMatches(entry, updated.name))) {
    throw new Error("An SSH alias with this name already exists.");
  }
  if (
    Object.values(fields).some(([key]) => containsControl(updated[key] ?? "")) ||
    (updated.port && (!/^\d+$/.test(updated.port) || Number(updated.port) < 1 || Number(updated.port) > 65535))
  )
    throw new Error("Check the port and remove control characters from the SSH settings.");

  const changed = new Map(
    Object.entries(fields).filter(([, [key]]) => (original?.[key] ?? "") !== (updated[key] ?? "")),
  );
  if (!original) {
    const index = text.search(/^[ \t]*(?:host|match)[ \t]*(?:=|[ \t])/im);
    const insertion = index < 0 ? text.length : index;
    const prefix = text.slice(0, insertion);
    const separator = prefix && !prefix.endsWith("\n") ? eol : "";
    const body = [...changed.values()]
      .map(([key, label]) => configDirective(key, label, updated[key] ?? "", eol))
      .join("");
    writeConfig(root, text, `${prefix}${separator}Host ${updated.name}${eol}${body}${text.slice(insertion)}`);
    return;
  }

  if (!changed.size && updated.name === original.name) return;
  const [header = "", ...body] = text.slice(block.start, block.end).match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const updatedBody = body.flatMap((line) => {
    const name = parseLine(line)?.name;
    if (!name || !changed.has(name)) return [line];
    const [key, label] = fields[name as Field];
    changed.delete(name);
    return updated[key] ? [configDirective(key, label, updated[key], eol)] : [];
  });
  const additions = [...changed.values()]
    .filter(([key]) => updated[key])
    .map(([key, label]) => configDirective(key, label, updated[key] ?? "", eol));
  const updatedHeader = updated.name === original.name ? header : `Host ${updated.name}${eol}`;
  const separator = additions.length && !updatedHeader.endsWith("\n") ? eol : "";
  const replacement = [updatedHeader, separator, ...additions, ...updatedBody].join("");
  writeConfig(root, text, text.slice(0, block.start) + replacement + text.slice(block.end));
}

export function setConfigConnectionIcon(
  configFile: string,
  connection: ISSHConnection,
  value: string,
  home = homedir(),
) {
  const { root, text, hosts } = scanConfig(configFile, home);
  const matches = hosts.filter((block) => aliasMatches(block, connection.name));
  const block = matches[0];
  if (connection.config?.file !== configFile || matches.length !== 1 || !editable(block, root)) {
    throw new Error("Edit this shared, included, or changed Host block in a text editor.");
  }
  if (connection.config.fingerprint !== fingerprint(block, text)) {
    throw new Error("The SSH config changed. Refresh the list and try again.");
  }
  const icon = value.trim();
  if (icon && !emojiIcon(icon)) throw new Error("Enter a single emoji or leave the icon blank.");
  const [header = "", ...body] = text.slice(block.start, block.end).match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const retained = body.filter((line) => !/^\s*#SSHManagerIcon\b/i.test(line));
  const separator = icon && !header.endsWith("\n") ? eol : "";
  const comment = icon ? `  #SSHManagerIcon ${icon}${eol}` : "";
  const replacement = [header, separator, comment, ...retained].join("");
  writeConfig(root, text, text.slice(0, block.start) + replacement + text.slice(block.end));
}
