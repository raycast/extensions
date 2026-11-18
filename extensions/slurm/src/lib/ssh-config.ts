import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import fg from "fast-glob";
import SSHConfig from "ssh-config";
import { LocalStorage } from "@raycast/api";
import { DEMO_MODE, DEMO_HOSTS } from "./demo";

const SSH_DIR = path.join(os.homedir(), ".ssh");
const ACTIVE_HOST_KEY = "activeHost";
const ACTIVE_HOSTS_KEY = "activeHosts";

export type Host = {
  name: string;
  hostName: string;
  user?: string;
  port?: string;
  identityFile?: string[];
};

async function readMaybe(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function inlineIncludes(filePath: string, visited: Set<string> = new Set()): Promise<string> {
  const abs = path.resolve(filePath);
  if (visited.has(abs)) return "";
  visited.add(abs);

  const text = await readMaybe(abs);
  if (text == null) return "";

  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*Include\s+(.+?)\s*$/i.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const tokens = m[1].match(/"[^"]+"|\S+/g) ?? [];
    for (const raw of tokens) {
      const unquoted = raw.replace(/^"|"$/g, "");
      const resolved = expandTilde(unquoted);
      const pattern = path.isAbsolute(resolved) ? resolved : path.resolve(SSH_DIR, resolved);
      const matches = await fg(pattern, { dot: true, onlyFiles: true });
      for (const file of matches) {
        out.push(await inlineIncludes(file, visited));
      }
    }
  }
  return out.join("\n");
}

function getAliases(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

export type ConfigState =
  | { kind: "ok"; cfg: SSHConfig }
  | { kind: "missing"; path: string }
  | { kind: "empty"; path: string }
  | { kind: "unreadable"; path: string; reason: string };

export const SSH_CONFIG_PATH = path.join(SSH_DIR, "config");

export async function loadConfigState(): Promise<ConfigState> {
  if (!(await fileExists(SSH_CONFIG_PATH))) {
    return { kind: "missing", path: SSH_CONFIG_PATH };
  }
  let text: string;
  try {
    text = await inlineIncludes(SSH_CONFIG_PATH);
  } catch (err) {
    return {
      kind: "unreadable",
      path: SSH_CONFIG_PATH,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
  if (!text.trim()) return { kind: "empty", path: SSH_CONFIG_PATH };
  try {
    return { kind: "ok", cfg: SSHConfig.parse(text) };
  } catch (err) {
    return {
      kind: "unreadable",
      path: SSH_CONFIG_PATH,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function loadConfig(): Promise<SSHConfig | null> {
  const state = await loadConfigState();
  return state.kind === "ok" ? state.cfg : null;
}

export type ListHostsResult = { hosts: Host[]; state: ConfigState };

export async function listHosts(): Promise<ListHostsResult> {
  if (DEMO_MODE) {
    return { hosts: [...DEMO_HOSTS], state: { kind: "ok", cfg: SSHConfig.parse("") } };
  }
  const state = await loadConfigState();
  if (state.kind !== "ok") return { hosts: [], state };

  const cfg = state.cfg;
  const seen = new Set<string>();
  const hosts: Host[] = [];

  for (const entry of cfg as unknown as Array<{ type: number; param?: string; value?: unknown }>) {
    if (entry.type !== 1) continue;
    if (typeof entry.param !== "string" || entry.param.toLowerCase() !== "host") continue;
    for (const alias of getAliases(entry.value)) {
      if (alias.includes("*") || alias.includes("?") || alias.includes("!")) continue;
      if (seen.has(alias)) continue;
      seen.add(alias);

      const resolved = cfg.compute(alias) as Record<string, string | string[] | undefined>;
      const hostName = (resolved.HostName as string | undefined) ?? alias;
      hosts.push({
        name: alias,
        hostName,
        user: resolved.User as string | undefined,
        port: resolved.Port as string | undefined,
        identityFile: resolved.IdentityFile as string[] | undefined,
      });
    }
  }

  hosts.sort((a, b) => a.name.localeCompare(b.name));
  return { hosts, state };
}

export async function resolveHost(name: string): Promise<Host | null> {
  const cfg = await loadConfig();
  if (!cfg) return null;
  const resolved = cfg.compute(name) as Record<string, string | string[] | undefined>;
  if (!resolved || !resolved.HostName) return null;
  return {
    name,
    hostName: resolved.HostName as string,
    user: resolved.User as string | undefined,
    port: resolved.Port as string | undefined,
    identityFile: resolved.IdentityFile as string[] | undefined,
  };
}

export async function getActiveHosts(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(ACTIVE_HOSTS_KEY);
  if (typeof raw === "string" && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((h): h is string => typeof h === "string" && h.length > 0);
      }
    } catch {
      /* fall through to legacy migration */
    }
  }
  // Legacy single-host migration: read activeHost, persist as [activeHost], remove legacy key.
  const legacy = await LocalStorage.getItem<string>(ACTIVE_HOST_KEY);
  if (typeof legacy === "string" && legacy.length > 0) {
    const migrated = [legacy];
    await LocalStorage.setItem(ACTIVE_HOSTS_KEY, JSON.stringify(migrated));
    await LocalStorage.removeItem(ACTIVE_HOST_KEY);
    return migrated;
  }
  if (DEMO_MODE) return DEMO_HOSTS.map((h) => h.name);
  return [];
}

export async function setActiveHosts(hosts: string[]): Promise<void> {
  const seen = new Set<string>();
  const deduped = hosts.filter((h) => {
    if (!h || seen.has(h)) return false;
    seen.add(h);
    return true;
  });
  await LocalStorage.setItem(ACTIVE_HOSTS_KEY, JSON.stringify(deduped));
}

export async function addActiveHost(host: string): Promise<string[]> {
  const cur = await getActiveHosts();
  if (cur.includes(host)) return cur;
  const next = [...cur, host];
  await setActiveHosts(next);
  return next;
}

export async function removeActiveHost(host: string): Promise<string[]> {
  const cur = await getActiveHosts();
  const next = cur.filter((h) => h !== host);
  if (next.length === cur.length) return cur;
  await setActiveHosts(next);
  return next;
}

// Backwards-compatible: returns the first active host (the legacy single-active concept).
export async function getActiveHost(): Promise<string | null> {
  const hosts = await getActiveHosts();
  return hosts[0] ?? null;
}

// Backwards-compatible: replaces the active set with [host].
export async function setActiveHost(host: string): Promise<void> {
  await setActiveHosts([host]);
}
