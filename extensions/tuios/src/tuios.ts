import { getPreferenceValues } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// Raycast starts extensions with a bare PATH. Add the usual install places so
// tuios, git and the agent CLIs (claude, codex…) resolve as they do in a shell.
const HOME = homedir();
const EXTRA_PATH = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  join(HOME, ".local/bin"),
  join(HOME, "go/bin"),
  join(HOME, ".bun/bin"),
  join(HOME, ".cargo/bin"),
  join(HOME, ".local/share/mise/shims"),
  join(HOME, ".volta/bin"),
];
export const ENV = {
  ...process.env,
  PATH: [...EXTRA_PATH, process.env.PATH ?? "", "/usr/bin:/bin:/usr/sbin:/sbin"].filter(Boolean).join(":"),
};

export function expandHome(p: string): string {
  return p.startsWith("~") ? join(HOME, p.slice(1)) : p;
}

export function tildify(p: string): string {
  return p.startsWith(HOME) ? "~" + p.slice(HOME.length) : p;
}

let cachedBin: string | undefined;
export function tuiosBin(): string {
  if (cachedBin) return cachedBin;
  const pref = getPreferenceValues<Preferences>().tuiosPath?.trim();
  if (pref) return (cachedBin = expandHome(pref));
  const found = EXTRA_PATH.map((d) => join(d, "tuios")).find((p) => existsSync(p));
  return (cachedBin = found ?? "tuios");
}

export type AgentState = "working" | "needs_input" | "idle" | "done" | "errored" | "unknown" | "none";

export interface Agent {
  window_id: string;
  name: string;
  session: string;
  workspace: number;
  state: AgentState;
  message: string;
  cwd: string;
  harness_id: string;
  unread: number;
  queued: number;
  agent_state_at: number;
}

/** Enough to address one pane. */
export type PaneRef = { session: string; window_id: string };

/** Any pane, agent or not, as list-windows reports it. */
export interface Pane extends PaneRef {
  workspace: number;
  name: string;
  title: string;
  command: string;
  cwd: string;
  focused: boolean;
  agent_state?: AgentState;
}

export interface Session {
  name: string;
  attached: boolean;
  window_count: number;
  current_workspace: number;
  last_active: number;
}

export interface Prompt {
  prompt_id: string;
  kind: string;
  message: string;
  lines: string[];
  actions: string[];
  options: { n: number; label: string }[];
  answerable: boolean;
  blocked: boolean;
}

export class TuiosError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

// Plain-language versions of the errors a fresh install is most likely to hit.
const FRIENDLY: Record<string, string> = {
  not_human:
    'tuios only takes answers from outside its panes when you allow it. Add respond_from_shell = true under [daemon] in your tuios config, then run "tuios config apply".',
  agents_disabled: "Agents are turned off in tuios. Set [agents] enabled = true in your tuios config.",
  prompt_changed: "The prompt changed or was already answered. Look again before answering.",
  pane_not_movable: "This pane can't move: popups, scratch panes and panes on other machines stay put.",
  same_session: "The pane is already in that session.",
};

export async function tuios(args: string[], timeout = 10000): Promise<string> {
  try {
    const { stdout } = await run(tuiosBin(), args, { env: ENV, timeout, maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    const err = e as { code?: string | number; stdout?: string; stderr?: string; message: string };
    if (err.code === "ENOENT") {
      throw new TuiosError(
        "tuios not found. Install it (brew install tuios) or set its path in the extension settings.",
      );
    }
    const out = `${err.stderr ?? ""}\n${err.stdout ?? ""}`;
    let msg = (err.stderr || err.stdout || err.message).trim().split("\n")[0];
    let code: string | undefined;
    try {
      const j = JSON.parse(err.stdout ?? "");
      msg = j.message || j.error || msg;
      code = j.code;
    } catch {
      /* not JSON */
    }
    code ??= Object.keys(FRIENDLY).find((k) => out.includes(k));
    if (/daemon.*not running|no such file.*sock|connection refused/i.test(out)) {
      msg = "The tuios daemon is not running. Open a terminal and run tuios.";
    }
    throw new TuiosError(code && FRIENDLY[code] ? FRIENDLY[code] : msg, code);
  }
}

async function json<T>(args: string[], timeout?: number): Promise<T> {
  return JSON.parse(await tuios([...args, "--json"], timeout)) as T;
}

/** Agent panes in every session. With `all`, every pane (shells too; their state is "none"). */
export async function listAgents(all = false): Promise<Agent[]> {
  const r = await json<{ agents: Agent[] }>(["list-agents", "--all-sessions", ...(all ? ["--all"] : [])]);
  return r.agents ?? [];
}

/** Every pane in every session: shells, editors, servers and agents. */
export async function listPanes(): Promise<Pane[]> {
  return (await json<{ panes: Pane[] }>(["list-windows", "--all"])).panes ?? [];
}

export interface Workspace {
  workspace: number;
  name: string;
  current: boolean;
  window_count: number;
}

/** The workspaces (tabs) of a session that hold panes. */
export async function listWorkspaces(session: string): Promise<Workspace[]> {
  return (await json<{ workspaces: Workspace[] }>(["list-workspaces", "-s", session])).workspaces ?? [];
}

/** Workspace number → name, for the workspaces that have one. */
export async function workspaceNames(session: string): Promise<Record<number, string>> {
  const ws = await listWorkspaces(session);
  return Object.fromEntries(ws.filter((w) => w.name).map((w) => [w.workspace, w.name]));
}

export async function listSessions(): Promise<Session[]> {
  return (await json<Session[]>(["ls"])) ?? [];
}

export async function capture(a: PaneRef, lines = 60): Promise<string> {
  return tuios(["capture-pane", "-s", a.session, "-w", a.window_id, "--lines", String(lines)]);
}

export async function focus(a: PaneRef): Promise<void> {
  await tuios(["focus-window", "-s", a.session, a.window_id]);
}

export async function peekPrompt(a: Agent): Promise<Prompt | undefined> {
  const p = await json<Prompt & { found: boolean }>(["peek-prompt", "-s", a.session, "-w", a.window_id]);
  return p.found ? p : undefined;
}

export type RespondAction = "approve" | "approve_always" | "deny" | "choose" | "text";

export async function respond(a: Agent, promptId: string, action: RespondAction, value?: string): Promise<void> {
  const args = ["respond", "-s", a.session, "-w", a.window_id, "--prompt-id", promptId, action];
  if (value !== undefined) args.push(value);
  await tuios(args, 35000);
}

export async function leaveNote(a: Agent, text: string): Promise<void> {
  await tuios(["send-agent-message", "-s", a.session, "-w", a.window_id, text]);
}

export async function queueTask(a: Agent, text: string): Promise<void> {
  await tuios(["queue", "-s", a.session, "-w", a.window_id, text]);
}

/** Move a pane to another session. Its program keeps running; it lands on the tab that session shows. */
export async function movePane(a: PaneRef, toSession: string): Promise<void> {
  await tuios(["move-window", "-s", a.session, "-w", a.window_id, "--to-session", toSession]);
}

export interface StartOptions {
  session: string;
  cwd: string;
  agent: string;
  workspace?: number;
  name?: string;
  prompt?: string;
}

/**
 * Start an agent in a new, focused pane. Resolves once the pane exists; rejects if tuios refuses.
 * start-agent itself keeps running until the agent is at its prompt (and types --prompt then), so it
 * runs detached and outlives Raycast. Its stderr goes to a temp file, not a pipe, so closing Raycast
 * can't break it.
 */
export async function startAgent(o: StartOptions, timeoutMs = 20000): Promise<void> {
  const before = new Set((await listPanes().catch(() => [])).map((p) => p.window_id));
  const args = ["start-agent", o.agent, "-s", o.session, "--cwd", o.cwd, "--focus"];
  if (o.workspace) args.push("--workspace", String(o.workspace));
  if (o.name) args.push("--name", o.name);
  if (o.prompt) args.push("--prompt", o.prompt);
  const log = join(tmpdir(), `raycast-tuios-start-${process.pid}-${Date.now()}.log`);
  const fd = openSync(log, "w");

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    };
    const child = spawn(tuiosBin(), args, { env: ENV, detached: true, stdio: ["ignore", "ignore", fd] });
    closeSync(fd);
    child.on("error", (e: NodeJS.ErrnoException) =>
      finish(e.code === "ENOENT" ? new TuiosError("tuios not found. Install it or set its path in settings.") : e),
    );
    child.on("exit", (code) => {
      if (!code) return finish();
      const out = readFileSync(log, "utf8").trim();
      const known = Object.keys(FRIENDLY).find((k) => out.includes(k));
      finish(new TuiosError(known ? FRIENDLY[known] : out.split("\n")[0] || `start-agent failed (exit ${code})`));
    });
    child.unref();
    const poll = setInterval(async () => {
      const panes = await listPanes().catch(() => []);
      if (panes.some((p) => p.session === o.session && !before.has(p.window_id))) finish();
    }, 300);
    const timer = setTimeout(
      () => finish(new TuiosError(`No new pane appeared in ${o.session} after ${timeoutMs / 1000} seconds.`)),
      timeoutMs,
    );
  });
}

export async function attachedClientPid(session: string): Promise<number | undefined> {
  const clients = await json<{ pid: number; session: string }[]>(["list-clients"]);
  return clients.find((c) => c.session === session)?.pid;
}

// Strip the harness's status glyph ("✳ ", "◑ ") from a title-like name.
export function cleanName(name: string): string {
  return name.replace(/^[^\p{L}\p{N}~/@$]+\s+/u, "") || name;
}
