import { globSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

// OpenSSH applies Include paths relative to ~/.ssh, including nested files.
export function readConfigHosts(sshDir = join(homedir(), ".ssh")): string[] {
  const seen = new Set<string>();
  const hosts = new Map<string, string>();
  function visit(path: string, optional: boolean) {
    const absolute = resolve(path);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    let content: string;
    try {
      content = readFileSync(absolute, "utf8");
    } catch (error) {
      if (optional && (error as NodeJS.ErrnoException).code === "ENOENT")
        return;
      throw error;
    }
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*(host|include)\s*(?:=\s*|\s+)(.*)$/i);
      if (!match) continue;
      // OpenSSH supports double-quoted arguments and comments.
      const values = match[2].match(/"(?:[^"\\]|\\.)*"|[^\s#]+|#.*/g) ?? [];
      for (const token of values) {
        if (token.startsWith("#")) break;
        const value =
          token.startsWith('"') && token.endsWith('"')
            ? token.slice(1, -1).replace(/\\(["\\])/g, "$1")
            : token;
        if (match[1].toLowerCase() === "host") {
          if (!value || value.startsWith("-") || /[!*?\s]/.test(value))
            continue;
          if (!hosts.has(value.toLowerCase()))
            hosts.set(value.toLowerCase(), value);
        } else {
          const expanded = value.replace(/^~(?=\/|$)/, homedir());
          const pattern = isAbsolute(expanded)
            ? expanded
            : join(sshDir, expanded);
          for (const file of globSync(pattern).sort()) visit(file, true);
        }
      }
    }
  }
  visit(join(sshDir, "config"), true);
  return [...hosts.values()].sort((a, b) => a.localeCompare(b));
}

import {
  chmodSync,
  mkdirSync,
  lstatSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

export interface ConfigFields {
  alias: string;
  host: string;
  user: string;
  port: string;
  identityFile: string;
}
type Block = {
  path: string;
  text: string;
  start: number;
  end: number;
  header: string;
};

function findBlocks(alias: string, sshDir: string): Block[] {
  const seen = new Set<string>();
  const blocks: Block[] = [];
  function visit(path: string) {
    const absolute = resolve(path);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    let text: string;
    try {
      text = readFileSync(absolute, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    let offset = 0;
    let active: { start: number; header: string } | undefined;
    for (const line of lines) {
      const directive = line.match(
        /^\s*(host|match|include)\s*(?:=\s*|\s+)(.*?)(?:\r?\n)?$/i,
      );
      if (directive && /^(host|match)$/i.test(directive[1])) {
        if (active) {
          blocks.push({
            path: absolute,
            text,
            start: active.start,
            end: offset,
            header: active.header,
          });
          active = undefined;
        }
        if (/^host$/i.test(directive[1])) {
          const values = directive[2].split(/\s+#/)[0].trim().split(/\s+/);
          if (
            values.some((value) => value.toLowerCase() === alias.toLowerCase())
          )
            active = { start: offset, header: directive[2] };
        }
      }
      if (directive && /^include$/i.test(directive[1])) {
        const values =
          directive[2].match(/"(?:[^"\\]|\\.)*"|[^\s#]+|#.*/g) ?? [];
        for (const token of values) {
          if (token.startsWith("#")) break;
          const value =
            token.startsWith('"') && token.endsWith('"')
              ? token.slice(1, -1).replace(/\\(["\\])/g, "$1")
              : token;
          const expanded = value.replace(/^~(?=\/|$)/, homedir());
          for (const file of globSync(
            isAbsolute(expanded) ? expanded : join(sshDir, expanded),
          ).sort())
            visit(file);
        }
      }
      offset += line.length;
    }
    if (active)
      blocks.push({
        path: absolute,
        text,
        start: active.start,
        end: offset,
        header: active.header,
      });
  }
  visit(join(sshDir, "config"));
  return blocks;
}

function editableBlock(alias: string, sshDir: string): Block {
  const blocks = findBlocks(alias, sshDir);
  if (blocks.length !== 1)
    throw new Error(
      "This alias appears in multiple Host blocks or was changed. Edit it in a text editor.",
    );
  const block = blocks[0];
  if (
    block.header
      .split(/\s+#/)[0]
      .trim()
      .split(/\s+/)
      .some((pattern) => pattern.toLowerCase() !== alias.toLowerCase()) ||
    /^\s*include\b/im.test(block.text.slice(block.start, block.end))
  )
    throw new Error(
      "This Host block contains multiple patterns or an Include. Edit it in a text editor to preserve its behavior.",
    );
  return block;
}

function decodeValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    let result = "";
    for (let i = 1; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '"') return result;
      if (
        c === "\\" &&
        i + 1 < trimmed.length &&
        (trimmed[i + 1] === '"' || trimmed[i + 1] === "\\")
      )
        result += trimmed[++i];
      else result += c;
    }
    return trimmed;
  }
  return trimmed.replace(/\s+#.*$/, "").trimEnd();
}
export function getConfigFields(
  alias: string,
  sshDir = join(homedir(), ".ssh"),
): ConfigFields {
  const block = editableBlock(alias, sshDir);
  const fields: ConfigFields = {
    alias,
    host: "",
    user: "",
    port: "",
    identityFile: "",
  };
  const mapping: Record<string, keyof ConfigFields> = {
    hostname: "host",
    user: "user",
    port: "port",
    identityfile: "identityFile",
  };
  const seen = new Set<string>();
  for (const line of block.text
    .slice(block.start, block.end)
    .split(/\r?\n/)
    .slice(1)) {
    const match = line.match(
      /^\s*(hostname|user|port|identityfile)\s*(?:=\s*|\s+)(.*?)\s*$/i,
    );
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (seen.has(key))
      throw new Error(
        `This block has multiple ${match[1]} directives. Edit it in a text editor.`,
      );
    seen.add(key);
    fields[mapping[key]] = decodeValue(match[2]);
  }
  return fields;
}
function configValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function checkedFields(fields: ConfigFields) {
  if (
    !fields.alias ||
    fields.alias.startsWith("-") ||
    /[\s!*?#"\\@:=]/.test(fields.alias) ||
    fields.alias.includes("[") ||
    fields.alias.includes("]")
  )
    throw new Error(
      "Use a single SSH alias without spaces, wildcards, @, colon, or brackets.",
    );
  for (const value of Object.values(fields))
    if ([...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
      throw new Error("Values cannot contain control characters.");
  if (
    fields.port &&
    (!/^\d+$/.test(fields.port) || +fields.port < 1 || +fields.port > 65535)
  )
    throw new Error("Port must be between 1 and 65535.");
}
function atomicWrite(path: string, expected: string, text: string) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  let target = path;
  try {
    target = realpathSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    try {
      if (lstatSync(path).isSymbolicLink())
        throw new Error(
          "SSH config is a dangling symlink. Fix it before saving.",
        );
    } catch (linkError) {
      if ((linkError as NodeJS.ErrnoException).code !== "ENOENT")
        throw linkError;
    }
  }
  let current = "";
  let mode = 0o600;
  try {
    current = readFileSync(target, "utf8");
    mode = statSync(target).mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (current !== expected)
    throw new Error("SSH config changed while editing. Refresh and try again.");
  const temp = join(dirname(target), `.ssh-manager-${randomUUID()}`);
  try {
    writeFileSync(temp, text, { mode, flag: "wx" });
    chmodSync(temp, mode);
    renameSync(temp, target);
  } finally {
    try {
      unlinkSync(temp);
    } catch {
      /* already renamed */
    }
  }
}
export function saveConfigFields(
  fields: ConfigFields,
  originalAlias?: string,
  sshDir = join(homedir(), ".ssh"),
): void {
  checkedFields(fields);
  const matches = findBlocks(fields.alias, sshDir);
  if (
    (!originalAlias ||
      originalAlias.toLowerCase() !== fields.alias.toLowerCase()) &&
    matches.length
  )
    throw new Error("That SSH alias already exists.");
  const directives = [
    ["HostName", fields.host],
    ["User", fields.user],
    ["Port", fields.port],
    ["IdentityFile", fields.identityFile],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `  ${key} ${configValue(value)}\n`)
    .join("");
  if (!originalAlias) {
    const path = join(sshDir, "config");
    let text = "";
    try {
      text = readFileSync(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    // Keep global directives global, and insert before the first Host or Match.
    const firstBlock = text.search(/^[ \t]*(?:Host|Match)[ \t]*(?:=|[ \t])/im);
    const index = firstBlock < 0 ? text.length : firstBlock;
    const prefix = text.slice(0, index);
    const separator = prefix && !prefix.endsWith("\n") ? "\n" : "";
    atomicWrite(
      path,
      text,
      `${prefix}${separator}Host ${fields.alias}\n${directives}${text.slice(index)}`,
    );
    return;
  }
  const block = editableBlock(originalAlias, sshDir);
  if (
    fields.alias !== originalAlias &&
    getConfigDisplay(originalAlias, sshDir).conditional
  )
    throw new Error(
      "This alias has Match rules. Rename it manually to keep those rules consistent.",
    );
  const current = getConfigFields(originalAlias, sshDir);
  const patterns = block.header.split(/\s+#/)[0].trim().split(/\s+/);
  if (patterns.length > 1 && fields.alias !== originalAlias)
    throw new Error(
      "This Host block has multiple equivalent spellings. Rename it manually to preserve all aliases and Match rules.",
    );
  const names = {
    hostname: "host",
    user: "user",
    port: "port",
    identityfile: "identityFile",
  } as const;
  const labels = {
    host: "HostName",
    user: "User",
    port: "Port",
    identityFile: "IdentityFile",
  } as const;
  const changed = new Set(
    (Object.keys(labels) as (keyof typeof labels)[]).filter(
      (key) => fields[key] !== current[key],
    ),
  );
  if (!changed.size && fields.alias === originalAlias) return;
  const lines = block.text.slice(block.start, block.end).split(/(?<=\n)/);
  const header =
    fields.alias === originalAlias ? lines[0] : `Host ${fields.alias}\n`;
  const output = [header];
  const replaced = new Set<keyof typeof labels>();
  for (const line of lines.slice(1)) {
    const match = line.match(
      /^[ \t]*(hostname|user|port|identityfile)[ \t]*(?:=|[ \t])/i,
    );
    const key = match && names[match[1].toLowerCase() as keyof typeof names];
    if (key && changed.has(key)) {
      replaced.add(key);
      if (fields[key])
        output.push(`  ${labels[key]} ${configValue(fields[key])}\n`);
    } else output.push(line);
  }
  const additions = [...changed]
    .filter((key) => !replaced.has(key) && fields[key])
    .map((key) => `  ${labels[key]} ${configValue(fields[key])}\n`)
    .join("");
  if (additions && !output[0].endsWith("\n")) output[0] += "\n";
  output.splice(1, 0, additions);
  atomicWrite(
    block.path,
    block.text,
    block.text.slice(0, block.start) +
      output.join("") +
      block.text.slice(block.end),
  );
}
export function deleteConfigHost(
  alias: string,
  sshDir = join(homedir(), ".ssh"),
): void {
  const block = editableBlock(alias, sshDir);
  if (getConfigDisplay(alias, sshDir).conditional)
    throw new Error(
      "This alias has Match rules. Delete it manually to review those rules.",
    );
  if (block.header.split(/\s+#/)[0].trim().split(/\s+/).length > 1)
    throw new Error(
      "This Host block has multiple spellings. Delete it manually to review related Match rules.",
    );
  const comments = block.text
    .slice(block.start, block.end)
    .split(/(?<=\n)/)
    .slice(1)
    .filter(
      (line) =>
        /^[ \t]*(?:#|\r?$)/.test(line) &&
        !/^[ \t]*#SSHManagerIcon(?:[ \t]|\r?$)/i.test(line),
    )
    .join("");
  atomicWrite(
    block.path,
    block.text,
    block.text.slice(0, block.start) + comments + block.text.slice(block.end),
  );
}

export interface ConfigDisplay {
  host: string;
  user: string;
  port: string;
  identityFile: string;
  conditionalHosts: string[];
  conditional: boolean;
}

/** Read explicit candidates for display only. Never evaluate Match exec. */
export function getConfigDisplay(
  alias: string,
  sshDir = join(homedir(), ".ssh"),
): ConfigDisplay {
  const result: ConfigDisplay = {
    host: "",
    user: "",
    port: "",
    identityFile: "",
    conditionalHosts: [],
    conditional: false,
  };
  const mapping: Record<string, "host" | "user" | "port" | "identityFile"> = {
    hostname: "host",
    user: "user",
    port: "port",
    identityfile: "identityFile",
  };
  for (const block of findBlocks(alias, sshDir)) {
    for (const line of block.text
      .slice(block.start, block.end)
      .split(/\r?\n/)
      .slice(1)) {
      const match = line.match(
        /^[ \t]*(hostname|user|port|identityfile)[ \t]*(?:=[ \t]*|[ \t]+)(.*?)\s*$/i,
      );
      if (!match) continue;
      const key = mapping[match[1].toLowerCase()];
      if (!result[key]) result[key] = decodeValue(match[2]);
    }
  }
  const visited = new Set<string>();
  function visit(path: string) {
    const absolute = resolve(path);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    let text: string;
    try {
      text = readFileSync(absolute, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    let matching = false;
    for (const line of text.split(/\r?\n/)) {
      const directive = line.match(
        /^[ \t]*(match|host|include|hostname)[ \t]*(?:=[ \t]*|[ \t]+)(.*)$/i,
      );
      if (!directive) continue;
      const key = directive[1].toLowerCase();
      const value = directive[2];
      if (key === "match") {
        const hostMatch = value.match(/(?:^|\s)host\s+([^\s]+)/i);
        const patterns = hostMatch?.[1].split(",") ?? [];
        matching = patterns.some(
          (pattern) => pattern.toLowerCase() === alias.toLowerCase(),
        );
        if (matching) result.conditional = true;
      } else if (key === "host") {
        matching = false;
      } else if (key === "hostname" && matching) {
        const candidate = decodeValue(value);
        if (candidate && !result.conditionalHosts.includes(candidate))
          result.conditionalHosts.push(candidate);
      } else if (key === "include") {
        const tokens = value.match(/"(?:[^"\\]|\\.)*"|[^\s#]+|#.*/g) ?? [];
        for (const token of tokens) {
          if (token.startsWith("#")) break;
          const name =
            token.startsWith('"') && token.endsWith('"')
              ? token.slice(1, -1).replace(/\\(["\\])/g, "$1")
              : token;
          const expanded = name.replace(/^~(?=\/|$)/, homedir());
          for (const file of globSync(
            isAbsolute(expanded) ? expanded : join(sshDir, expanded),
          ).sort())
            visit(file);
        }
      }
    }
  }
  visit(join(sshDir, "config"));
  return result;
}

const sceIcons: Record<string, string> = {
  apple: "🍎",
  asterisk: "✳️",
  debian: "🌀",
  dev: "🛠️",
  gentoo: "🐧",
  html5: "🌐",
  solaris: "☀️",
};
export const advancedNames = [
  "ForwardAgent",
  "ServerAliveInterval",
  "ProxyJump",
  "ProxyCommand",
  "RemoteCommand",
  "RequestTTY",
  "LocalForward",
  "RemoteForward",
  "DynamicForward",
] as const;
export type AdvancedName = (typeof advancedNames)[number];
export type AdvancedOptions = Record<AdvancedName, string>;
export interface Presentation {
  emoji: string;
  customEmoji: string;
  tags: string[];
  advanced: Partial<AdvancedOptions>;
}
export function getPresentation(
  alias: string,
  sshDir = join(homedir(), ".ssh"),
): Presentation {
  const data: Presentation = {
    emoji: "",
    customEmoji: "",
    tags: [],
    advanced: {},
  };
  for (const block of findBlocks(alias, sshDir)) {
    for (const line of block.text
      .slice(block.start, block.end)
      .split(/\r?\n/)) {
      let m = line.match(/^[ \t]*#SSHManagerIcon[ \t]+(\S+)[ \t]*$/i);
      if (m && !data.customEmoji) data.customEmoji = m[1];
      m = line.match(/^[ \t]*#SCEIcon[ \t]+(\S+)/i);
      if (m && !data.emoji) data.emoji = sceIcons[m[1].toLowerCase()] || "";
      m = line.match(/^[ \t]*#SCETags[ \t]+(.*)$/i);
      if (m)
        for (const tag of m[1].split(/[ ,]+/).filter(Boolean))
          if (!data.tags.includes(tag)) data.tags.push(tag);
      m = line.match(
        /^[ \t]*(ForwardAgent|ServerAliveInterval|ProxyJump|ProxyCommand|RemoteCommand|RequestTTY|LocalForward|RemoteForward|DynamicForward)[ \t]*(?:=[ \t]*|[ \t]+)(.*)$/i,
      );
      if (m) {
        const key = advancedNames.find(
          (name) => name.toLowerCase() === m![1].toLowerCase(),
        )!;
        if (!data.advanced[key]) data.advanced[key] = m[2].trim();
      }
    }
  }
  data.emoji = data.customEmoji || data.emoji;
  return data;
}
export function setHostEmoji(
  alias: string,
  emoji: string,
  sshDir = join(homedir(), ".ssh"),
): void {
  const blocks = findBlocks(alias, sshDir);
  if (blocks.length !== 1)
    throw new Error(
      "This alias occurs in multiple Host blocks. Edit its icon in the config file.",
    );
  const value = emoji.trim();
  if (
    value &&
    ([
      ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
        value,
      ),
    ].length !== 1 ||
      !/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(value))
  )
    throw new Error(
      "Enter one emoji, or leave empty to use the original icon.",
    );
  const block = blocks[0];
  const lines = block.text.slice(block.start, block.end).split(/(?<=\n)/);
  const body = lines
    .slice(1)
    .filter((line) => !/^[ \t]*#SSHManagerIcon(?:[ \t]|\r?$)/i.test(line))
    .join("");
  const replacement =
    lines[0] +
    (value && !lines[0].endsWith("\n") ? "\n" : "") +
    (value ? `  #SSHManagerIcon ${value}\n` : "") +
    body;
  atomicWrite(
    block.path,
    block.text,
    block.text.slice(0, block.start) +
      replacement +
      block.text.slice(block.end),
  );
}
export function getAdvancedOptions(
  alias: string,
  sshDir = join(homedir(), ".ssh"),
): AdvancedOptions {
  const block = editableBlock(alias, sshDir);
  const data = Object.fromEntries(
    advancedNames.map((name) => [name, ""]),
  ) as AdvancedOptions;
  const seen = new Set<string>();
  for (const line of block.text.slice(block.start, block.end).split(/\r?\n/)) {
    const m = line.match(/^[ \t]*([a-z]+)[ \t]*(?:=[ \t]*|[ \t]+)(.*)$/i);
    const key =
      m &&
      advancedNames.find((name) => name.toLowerCase() === m[1].toLowerCase());
    if (!key || !m) continue;
    if (seen.has(key))
      throw new Error(`Multiple ${key} directives need manual editing.`);
    seen.add(key);
    data[key] = m[2].trim();
  }
  return data;
}
export function saveAdvancedOptions(
  alias: string,
  next: AdvancedOptions,
  initial: AdvancedOptions,
  sshDir = join(homedir(), ".ssh"),
): void {
  const block = editableBlock(alias, sshDir);
  if (
    JSON.stringify(getAdvancedOptions(alias, sshDir)) !==
    JSON.stringify(initial)
  )
    throw new Error(
      "Options changed while the form was open. Refresh and try again.",
    );
  for (const name of advancedNames)
    if (
      [...next[name]].some(
        (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
      )
    )
      throw new Error("Option values cannot contain control characters.");
  const changes = new Set(
    advancedNames.filter((name) => next[name].trim() !== initial[name]),
  );
  const tty = next.RequestTTY.trim();
  if (changes.has("RequestTTY") && tty && !/^(auto|yes|no|force)$/i.test(tty))
    throw new Error("RequestTTY must be auto, yes, no, or force.");
  const interval = next.ServerAliveInterval.trim();
  if (changes.has("ServerAliveInterval") && interval && !/^\d+$/.test(interval))
    throw new Error("ServerAliveInterval must be a number of seconds.");
  if (!changes.size) return;
  const lines = block.text.slice(block.start, block.end).split(/(?<=\n)/);
  const output = [lines[0]];
  const replaced = new Set<AdvancedName>();
  for (const line of lines.slice(1)) {
    const m = line.match(/^[ \t]*([a-z]+)[ \t]*(?:=[ \t]*|[ \t]+)/i);
    const key =
      m &&
      advancedNames.find((name) => name.toLowerCase() === m[1].toLowerCase());
    if (key && changes.has(key)) {
      replaced.add(key);
      if (next[key].trim()) output.push(`  ${key} ${next[key].trim()}\n`);
    } else output.push(line);
  }
  const additions = advancedNames
    .filter(
      (name) => changes.has(name) && !replaced.has(name) && next[name].trim(),
    )
    .map((name) => `  ${name} ${next[name].trim()}\n`)
    .join("");
  if (additions && !output[0].endsWith("\n")) output[0] += "\n";
  output.splice(1, 0, additions);
  atomicWrite(
    block.path,
    block.text,
    block.text.slice(0, block.start) +
      output.join("") +
      block.text.slice(block.end),
  );
}
