import { readFileSync, writeFileSync, existsSync, globSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { SSHHost } from "./types";

const SSH_CONFIG_PATH = join(homedir(), ".ssh", "config");

interface RawHostEntry {
  name: string;
  hostname: string;
  user: string;
  port: number;
  identityFile?: string;
  forwardAgent?: boolean;
}

function expandPath(p: string): string {
  return p.replace(/^~/, homedir());
}

export function parseSSHConfig(configPath = SSH_CONFIG_PATH): RawHostEntry[] {
  const seen = new Set<string>();
  const entries: RawHostEntry[] = [];

  function loadFile(filePath: string) {
    const expanded = expandPath(filePath);
    if (seen.has(expanded) || !existsSync(expanded)) return;
    seen.add(expanded);

    let text: string;
    try {
      text = readFileSync(expanded, "utf-8");
    } catch {
      return;
    }

    let current: Partial<RawHostEntry> | null = null;

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const lower = line.toLowerCase();

      if (lower.startsWith("include ")) {
        const pattern = line.split(/\s+/, 2)[1];
        if (pattern) {
          const expanded2 = expandPath(pattern);
          if (expanded2.includes("*") || expanded2.includes("?")) {
            for (const match of globSync(expanded2)) {
              loadFile(match);
            }
          } else if (existsSync(expanded2)) {
            loadFile(expanded2);
          }
        }
        continue;
      }

      if (lower.startsWith("host ")) {
        if (current?.name) {
          entries.push(finalizeEntry(current));
        }
        const hostPatterns = line.split(/\s+/).slice(1);
        const hostName = hostPatterns[0] || "";
        if (
          hostName === "*" ||
          hostName.includes("*") ||
          hostName.includes("?")
        ) {
          current = null;
          continue;
        }
        current = { name: hostName };
        continue;
      }

      if (!current) continue;

      const match = line.match(/^(\S+)\s*[=\s]\s*(.+)$/);
      if (!match) continue;
      const [, key, value] = match;
      const keyLower = key.toLowerCase();

      switch (keyLower) {
        case "hostname":
          current.hostname = value;
          break;
        case "user":
          current.user = value;
          break;
        case "port":
          current.port = parseInt(value, 10);
          break;
        case "identityfile":
          current.identityFile = value;
          break;
        case "forwardagent":
          current.forwardAgent = value.toLowerCase() === "yes";
          break;
      }
    }

    if (current?.name) {
      entries.push(finalizeEntry(current));
    }
  }

  function finalizeEntry(partial: Partial<RawHostEntry>): RawHostEntry {
    return {
      name: partial.name || "",
      hostname: partial.hostname || partial.name || "",
      user: partial.user || "",
      port: partial.port || 22,
      identityFile: partial.identityFile,
      forwardAgent: partial.forwardAgent,
    };
  }

  loadFile(configPath);
  return entries;
}

function normalizeIdentityPath(p: string): string {
  return p.replace(/^~\//, "").replace(/^\.ssh\//, "");
}

function matchPatterns(name: string, patterns: string): boolean {
  return patterns
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((pattern) => {
      const re = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
      );
      return re.test(name);
    });
}

export interface ClassifyOptions {
  workPatterns?: string;
  personalPatterns?: string;
  workIdentityFiles?: string[];
  personalIdentityFiles?: string[];
  excludedHosts: Set<string>;
}

export function classifyHosts(
  entries: RawHostEntry[],
  opts: ClassifyOptions,
): SSHHost[] {
  const {
    workPatterns,
    personalPatterns,
    workIdentityFiles = [],
    personalIdentityFiles = [],
    excludedHosts,
  } = opts;

  return entries
    .filter((e) => !excludedHosts.has(e.name) && e.name.length > 0)
    .filter((e) => !excludedHosts.has(e.hostname.toLowerCase()))
    .map((e) => {
      let category: "work" | "personal" = "work";

      if (workPatterns && matchPatterns(e.name, workPatterns)) {
        category = "work";
      } else if (personalPatterns && matchPatterns(e.name, personalPatterns)) {
        category = "personal";
      } else if (e.identityFile) {
        const norm = normalizeIdentityPath(e.identityFile);
        if (
          personalIdentityFiles.some((p) => normalizeIdentityPath(p) === norm)
        ) {
          category = "personal";
        } else if (
          workIdentityFiles.some((p) => normalizeIdentityPath(p) === norm)
        ) {
          category = "work";
        }
      }

      return {
        name: e.name,
        hostname: e.hostname,
        user: e.user,
        port: e.port,
        identityFile: e.identityFile,
        category,
      };
    });
}

export function getHosts(opts: ClassifyOptions): SSHHost[] {
  const raw = parseSSHConfig();
  return classifyHosts(raw, opts);
}

export function hostExistsByUser(
  user: string,
  hostname: string,
): string | null {
  const entries = parseSSHConfig();
  const match = entries.find((e) => e.user === user && e.hostname === hostname);
  return match ? match.name : null;
}

export function appendHostToConfig(
  alias: string,
  hostname: string,
  user: string,
  port: number,
  identityFile?: string,
): void {
  const lines = [
    "",
    `Host ${alias}`,
    `  HostName ${hostname}`,
    `  User ${user}`,
    `  Port ${port}`,
    `  ForwardAgent yes`,
    `  ServerAliveInterval 60`,
    `  TCPKeepAlive no`,
  ];
  if (identityFile) {
    lines.push(`  IdentitiesOnly yes`);
    lines.push(`  IdentityFile ${identityFile}`);
  }
  lines.push("");
  const block = lines.join("\n");

  const configContent = existsSync(SSH_CONFIG_PATH)
    ? readFileSync(SSH_CONFIG_PATH, "utf-8")
    : "";

  writeFileSync(
    SSH_CONFIG_PATH,
    configContent.trimEnd() + "\n" + block,
    "utf-8",
  );
}

export interface ParsedSSHCommand {
  user: string;
  hostname: string;
  port: number;
  alias: string;
}

export function parseSSHConnectionString(cmd: string): ParsedSSHCommand | null {
  const trimmed = cmd.trim().replace(/^ssh\s+/, "");

  let user = "";
  let hostname = "";
  let port = 22;

  const parts = trimmed.split(/\s+/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "-p" && i + 1 < parts.length) {
      port = parseInt(parts[++i], 10) || 22;
    } else if (part === "-i" && i + 1 < parts.length) {
      i++; // skip identity path, we use mlspace key
    } else if (part.includes("@") && !user) {
      const [u, h] = part.split("@");
      user = u;
      hostname = h;
    }
  }

  if (!user || !hostname) return null;

  const dotIdx = user.indexOf(".");
  const alias = dotIdx > 0 ? user.substring(0, dotIdx) : user;

  return { user, hostname, port, alias };
}
