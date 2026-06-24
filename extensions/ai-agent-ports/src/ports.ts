import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const execFileP = promisify(execFile);

/** Where to send users who don't have the third-party `ports` CLI installed yet. */
export const PORTS_WEBSITE = "https://portscli.com";
export const PORTS_INSTALL_COMMAND = "brew install erdemylmaz/ports-cli/ports";

/** Thrown when the `ports` binary can't be found or run, so the UI can show a setup guide instead of a raw error. */
export class PortsCliNotFoundError extends Error {
  constructor(readonly path: string) {
    super(`The "ports" CLI was not found at "${path}".`);
    this.name = "PortsCliNotFoundError";
  }
}

export function isCliNotFound(error: unknown): boolean {
  return (
    error instanceof PortsCliNotFoundError ||
    (error as { name?: string } | null)?.name === "PortsCliNotFoundError"
  );
}

export function cliNotFoundPath(error: unknown): string | undefined {
  return error instanceof PortsCliNotFoundError ? error.path : undefined;
}

interface Preferences {
  binaryPath: string;
  extraQueries: string;
  agentRoles: string;
}

const DEFAULT_AI_QUERIES = [
  "codex",
  "claude code",
  "claude",
  "gemini",
  "cursor",
];
const PROBE_PATHS = [
  "/opt/homebrew/bin/ports",
  "/usr/local/bin/ports",
  `${process.env.HOME ?? ""}/.local/bin/ports`,
];

export interface PortRow {
  pid: number;
  rootPid?: number;
  command: string;
  fullCommand?: string;
  parentPid?: number;
  parentCommand?: string;
  cwd?: string;
  workspace?: string;
  port?: number;
  proto?: string;
  host?: string;
  age?: string;
  kind?: string;
  role?: string;
  provider?: string;
  identity?: string;
  session?: string;
  caffeinated: boolean;
  caffeinateWatcher?: number;
  raw: Record<string, unknown>;
}

/** A logical AI session — one project + provider, with all the PIDs belonging to it. */
export interface AgentSession {
  key: string;
  provider: string;
  workspace: string;
  workspaceLabel: string;
  rows: PortRow[];
  pids: number[];
  caffeinatedPids: number[];
  anyCaffeinated: boolean;
  allCaffeinated: boolean;
  oldestAge?: string;
}

function pref(): Preferences {
  return getPreferenceValues<Preferences>();
}

function binary(): string {
  const fromPref = pref().binaryPath?.trim();
  if (fromPref) return fromPref;
  for (const p of PROBE_PATHS) {
    if (existsSync(p)) return p;
  }
  return "/opt/homebrew/bin/ports";
}

function extraQueries(): string[] {
  const v = pref().extraQueries;
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function allowedRoles(): Set<string> | null {
  const raw = pref().agentRoles?.trim();
  if (!raw || raw === "*") return null;
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseCaffeinate(v: unknown): { active: boolean; watcher?: number } {
  if (v == null || v === "" || v === false) return { active: false };
  if (v === true) return { active: true };
  if (typeof v === "number") return { active: true, watcher: v };
  if (typeof v === "string") {
    const m = v.match(/(?:on[:\s]*)?(\d+)/);
    if (m) return { active: true, watcher: Number(m[1]) };
    return { active: /^(on|true|yes|1)$/i.test(v.trim()) };
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const watcher =
      typeof o.watcher === "number"
        ? o.watcher
        : typeof o.pid === "number"
          ? o.pid
          : undefined;
    const active = Boolean(o.active ?? o.on ?? o.enabled ?? watcher);
    return { active, watcher };
  }
  return { active: false };
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  return undefined;
}

function normalize(row: Record<string, unknown>): PortRow | null {
  const pid = num(row.pid);
  if (pid == null) return null;
  const caf = parseCaffeinate(row.caffeinated ?? row.caffeinate);
  return {
    pid,
    rootPid: num(row.root_pid),
    command: str(row.command) ?? "",
    fullCommand: str(row.full_command),
    parentPid: num(row.parent_pid),
    parentCommand: str(row.parent_command),
    cwd: str(row.cwd),
    workspace: str(row.workspace),
    port: num(row.port),
    proto: str(row.protocol) ?? str(row.proto),
    host: str(row.host),
    age: str(row.age),
    kind: str(row.kind),
    role: str(row.role),
    provider: str(row.provider),
    identity: str(row.identity),
    session: str(row.session),
    caffeinated: caf.active,
    caffeinateWatcher: caf.watcher,
    raw: row,
  };
}

const DAEMON_PATH_PREFIXES = [
  "/private/tmp/cc-daemon",
  "/private/var/folders",
  "/tmp/cc-daemon",
];

function looksLikeRealSession(row: PortRow): boolean {
  const ws = row.workspace ?? row.cwd;
  if (!ws || ws === "/" || ws === "") return false;
  if (DAEMON_PATH_PREFIXES.some((p) => ws.startsWith(p))) return false;
  return true;
}

async function run(args: string[]): Promise<string> {
  const bin = binary();
  try {
    const { stdout } = await execFileP(bin, args, {
      timeout: 15_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES") {
      throw new PortsCliNotFoundError(bin);
    }
    throw err;
  }
}

export async function listPorts(): Promise<PortRow[]> {
  const out = await run(["list", "--json", "--all"]);
  const parsed = JSON.parse(out.trim() || "[]");
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [];
  return rows.map(normalize).filter((r): r is PortRow => r !== null);
}

export async function findAgents(): Promise<PortRow[]> {
  const queries = [...DEFAULT_AI_QUERIES, ...extraQueries()];
  const out = await run(["find", "--json", ...queries]);
  const parsed = JSON.parse(out.trim() || "[]");
  const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [];
  return rows.map(normalize).filter((r): r is PortRow => r !== null);
}

/** Real interactive sessions (drop empty-workspace daemons and helper paths). Per-PID, sorted so siblings cluster. */
export async function findRealAgents(): Promise<PortRow[]> {
  const allowed = allowedRoles();
  const rows = (await findAgents()).filter((r) => {
    if (allowed && (!r.role || !allowed.has(r.role.toLowerCase())))
      return false;
    return looksLikeRealSession(r);
  });
  return rows.sort((a, b) => {
    const pa = a.provider ?? a.command;
    const pb = b.provider ?? b.command;
    if (pa !== pb) return pa.localeCompare(pb);
    const wa = workspaceLabel(a);
    const wb = workspaceLabel(b);
    if (wa !== wb) return wa.localeCompare(wb);
    return ageRank(a.age) - ageRank(b.age);
  });
}

/** Group filtered rows by (provider, workspace). Each session keeps the full row list so UIs can expand into children. */
export async function findSessions(): Promise<AgentSession[]> {
  const rows = await findRealAgents();
  return groupBySession(rows);
}

function groupBySession(rows: PortRow[]): AgentSession[] {
  const home = process.env.HOME ?? "";
  const groups = new Map<string, AgentSession>();
  for (const r of rows) {
    const provider = r.provider ?? r.command ?? "Unknown";
    const ws = r.workspace ?? r.cwd ?? "";
    const key = `${provider}::${ws}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        provider,
        workspace: ws,
        workspaceLabel:
          home && ws.startsWith(home) ? "~" + ws.slice(home.length) : ws,
        rows: [],
        pids: [],
        caffeinatedPids: [],
        anyCaffeinated: false,
        allCaffeinated: false,
      };
      groups.set(key, g);
    }
    g.rows.push(r);
    g.pids.push(r.pid);
    if (r.caffeinated) g.caffeinatedPids.push(r.pid);
  }
  for (const g of groups.values()) {
    g.anyCaffeinated = g.caffeinatedPids.length > 0;
    g.allCaffeinated = g.caffeinatedPids.length === g.pids.length;
    g.oldestAge = g.rows.map((r) => r.age).filter(Boolean)[0];
  }
  return [...groups.values()].sort((a, b) => {
    if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
    return a.workspaceLabel.localeCompare(b.workspaceLabel);
  });
}

/** Very rough age ranker: "5d3h" → 5*1440 + 3*60 minutes. Used to sort siblings stably. */
function ageRank(age?: string): number {
  if (!age) return Number.MAX_SAFE_INTEGER;
  let total = 0;
  for (const m of age.matchAll(/(\d+)([dhms])/g)) {
    const n = Number(m[1]);
    const u = m[2];
    total += n * (u === "d" ? 1440 : u === "h" ? 60 : u === "m" ? 1 : 1 / 60);
  }
  return -total;
}

/** Short label for a single PID — used inside a session group ("pid 3485 · 5d3h · zsh"). */
export function rowLabel(row: PortRow): string {
  const parts = [`pid ${row.pid}`];
  if (row.age) parts.push(row.age);
  if (row.parentCommand) parts.push(row.parentCommand.replace(/^\(|\)$/g, ""));
  return parts.join(" · ");
}

export function workspaceLabel(row: PortRow): string {
  const ws = row.workspace ?? row.cwd;
  if (!ws) return "";
  const home = process.env.HOME ?? "";
  if (home && ws.startsWith(home)) return "~" + ws.slice(home.length);
  return ws;
}

export async function caffeinate(pid: number): Promise<void> {
  await run(["caffeinate", "--pid", String(pid), "--yes"]);
}

export async function uncaffeinate(pid: number): Promise<void> {
  await run(["uncaffeinate", "--pid", String(pid), "--yes"]);
}

export async function killPid(pid: number, force = false): Promise<void> {
  await run([force ? "force-kill" : "kill", "--pid", String(pid), "--yes"]);
}

export async function pausePid(pid: number): Promise<void> {
  await run(["pause", "--pid", String(pid), "--yes"]);
}

export async function resumePid(pid: number): Promise<void> {
  await run(["resume", "--pid", String(pid), "--yes"]);
}
