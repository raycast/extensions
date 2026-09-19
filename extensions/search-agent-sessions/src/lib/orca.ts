import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ORCA_BIN, ORCA_BUNDLE_ID, SPAWN_ENV, enclosingRoot } from "./paths";
import type { SessionMeta } from "./types";

const run = promisify(execFile);

const OPTS = { timeout: 8000, maxBuffer: 8 << 20, env: SPAWN_ENV } as const;

/** Partial decode of `orca --json`; fields we never read are left out. */
export interface OrcaTerminal {
  handle: string;
  worktreePath: string;
  title: string;
  preview?: string;
}

async function orcaJson<T>(args: string[]): Promise<T> {
  const { stdout } = await run(ORCA_BIN, [...args, "--json"], OPTS);
  const parsed = JSON.parse(stdout);
  if (parsed.ok === false)
    throw new Error(parsed.error?.message ?? "orca reported a failure");
  return parsed.result as T;
}

export async function listTerminals(): Promise<OrcaTerminal[]> {
  const result = await orcaJson<{ terminals?: OrcaTerminal[] }>([
    "terminal",
    "list",
  ]);
  return result.terminals ?? [];
}

/**
 * `terminal list` previews are truncated to the last couple of lines, which
 * usually miss the status line carrying the session id; `terminal show` returns
 * the full pane preview.
 */
export async function showTerminal(handle: string): Promise<OrcaTerminal> {
  const result = await orcaJson<{ terminal: OrcaTerminal }>([
    "terminal",
    "show",
    "--terminal",
    handle,
  ]);
  return result.terminal;
}

export async function switchTerminal(handle: string): Promise<void> {
  await orcaJson(["terminal", "switch", "--terminal", handle]);
}

/**
 * Creates the terminal, then focuses it with a separate `switch`. `create
 * --focus` is not usable: it reliably fails with "Timed out waiting for
 * terminal handle after creation" and leaves no terminal behind, while the same
 * call without `--focus` succeeds and returns a handle.
 */
export async function createTerminal(
  cwd: string,
  command: string,
): Promise<void> {
  const result = await orcaJson<{ terminal?: { handle?: string } }>([
    "terminal",
    "create",
    "--worktree",
    // Unresolved on purpose, unlike `openFileInOrca` below: `path:` matches a
    // worktree root exactly, so a session started below its root fails here and
    // falls back to the clipboard. Resolving it would need a `cd` in front of
    // the command, since `claude --resume` looks a session up by directory, and
    // would leave the live dot — keyed on the same raw cwd — disagreeing with
    // an Enter that had started working. The two have to move together.
    `path:${cwd}`,
    "--command",
    command,
  ]);
  const handle = result.terminal?.handle;
  if (handle) await switchTerminal(handle);
}

/** The worktree roots Orca knows about, which is what `path:` selects by. */
async function worktreeRoots(): Promise<string[]> {
  const result = await orcaJson<{ worktrees?: { path?: string }[] }>([
    "worktree",
    "list",
  ]);
  return (result.worktrees ?? [])
    .map((w) => w.path)
    .filter((p): p is string => Boolean(p));
}

/**
 * Open a file in the Orca worktree that contains it.
 *
 * `orca file open` takes "an absolute path inside that worktree", and `path:`
 * matches a worktree root exactly rather than any directory within one. So the
 * selector has to be derived from the file, and derived by containment: the
 * session's own directory is the wrong answer twice over, being usually a
 * subdirectory of its root rather than the root, and saying nothing about where
 * a file the session merely mentioned actually lives.
 *
 * A file in no worktree is refused here rather than by Orca, which is the same
 * outcome one subprocess sooner — and it is the common case, transcripts naming
 * files all over the disk and living outside any worktree themselves.
 */
export async function openFileInOrca(path: string): Promise<void> {
  const worktree = enclosingRoot(path, await worktreeRoots());
  if (!worktree) throw new Error(`${path} is in no Orca worktree`);
  await orcaJson([
    "file",
    "open",
    "--path",
    path,
    "--worktree",
    `path:${worktree}`,
  ]);
}

/**
 * Brings Orca to the front. `orca file open` opens the tab and returns
 * `ok:true` without activating the app, so on its own it leaves the file in a
 * window nobody is looking at.
 */
export async function focusOrca(): Promise<void> {
  await run("/usr/bin/open", ["-b", ORCA_BUNDLE_ID], OPTS);
}

/** The command that reopens a session where it left off. */
export function resumeCommand(session: SessionMeta): string {
  return session.agent === "claude"
    ? `claude --resume ${session.id}`
    : `codex resume ${session.id}`;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

/** session key (see {@link liveSessionKey}) -> terminal handle. */
export type LiveSessionMap = Map<string, string>;

/**
 * A pane may only claim a session it shares a working directory with, so live
 * sessions are keyed by directory *and* id. Without the directory, any pane
 * that merely printed a uuid — a log tail, a `--resume <id>` command typed
 * elsewhere, this extension's own output — would claim the session and send
 * Enter to an unrelated terminal. The key is built at both ends from the same
 * function, keeping the lookup a single O(1) `get` per rendered row; NUL cannot
 * occur in a path, so the two halves can never run together.
 */
export function liveSessionKey(session: { id: string; cwd: string }): string {
  return `${session.cwd}\u0000${session.id}`;
}

/**
 * Indexes every live pane by the sessions it is running. Claude's status line
 * prints its session id and Codex panes are usually launched with theirs on the
 * command line, so scanning full previews identifies the exact live session
 * rather than merely "something is running in that directory"; matching the
 * pane's worktree as well keeps a stray uuid in some other project from
 * claiming it.
 */
export async function liveSessionHandles(
  terminals: OrcaTerminal[],
): Promise<LiveSessionMap> {
  // Unanchored panes can never match a session, so they are dropped before the
  // fan-out: each preview costs a ~100ms subprocess.
  const anchored = terminals.filter((t) => t.worktreePath);
  const previews = await Promise.all(
    anchored.map(async (t) => {
      try {
        const full = await showTerminal(t.handle);
        return { terminal: t, preview: full.preview ?? "" };
      } catch {
        // Pane disappeared between list and show; its list preview is all we have.
        return { terminal: t, preview: t.preview ?? "" };
      }
    }),
  );
  const found: LiveSessionMap = new Map();
  for (const { terminal, preview } of previews) {
    for (const id of preview.match(UUID) ?? []) {
      const key = liveSessionKey({ id, cwd: terminal.worktreePath });
      if (!found.has(key)) found.set(key, terminal.handle);
    }
  }
  return found;
}

/**
 * Resolves the terminal already running a session, for the case where the mount
 * sweep has not landed (or the pane appeared since). Deliberately built on the
 * same index as {@link liveSessionHandles}: a second, subtly different predicate
 * here would make the live indicator on a row and the Enter action disagree.
 * Restricting the candidates to the session's own worktree keeps the number of
 * `terminal show` calls the same as the previous per-pane scan, but they now run
 * in parallel instead of serially.
 */
export async function findTerminalForSession(
  session: SessionMeta,
  terminals: OrcaTerminal[],
): Promise<string | undefined> {
  const candidates = terminals.filter((t) => t.worktreePath === session.cwd);
  const live = await liveSessionHandles(candidates);
  return live.get(liveSessionKey(session));
}
