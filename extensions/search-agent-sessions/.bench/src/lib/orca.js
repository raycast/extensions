"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTerminals = listTerminals;
exports.showTerminal = showTerminal;
exports.switchTerminal = switchTerminal;
exports.createTerminal = createTerminal;
exports.openFileInOrca = openFileInOrca;
exports.resumeCommand = resumeCommand;
exports.liveSessionKey = liveSessionKey;
exports.liveSessionHandles = liveSessionHandles;
exports.findTerminalForSession = findTerminalForSession;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const paths_1 = require("./paths");
const run = (0, node_util_1.promisify)(node_child_process_1.execFile);
const OPTS = { timeout: 8000, maxBuffer: 8 << 20, env: paths_1.SPAWN_ENV };
async function orcaJson(args) {
    const { stdout } = await run(paths_1.ORCA_BIN, [...args, "--json"], OPTS);
    const parsed = JSON.parse(stdout);
    if (parsed.ok === false)
        throw new Error(parsed.error?.message ?? "orca reported a failure");
    return parsed.result;
}
async function listTerminals() {
    const result = await orcaJson([
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
async function showTerminal(handle) {
    const result = await orcaJson([
        "terminal",
        "show",
        "--terminal",
        handle,
    ]);
    return result.terminal;
}
async function switchTerminal(handle) {
    await orcaJson(["terminal", "switch", "--terminal", handle]);
}
/**
 * Creates the terminal, then focuses it with a separate `switch`. `create
 * --focus` is not usable: it reliably fails with "Timed out waiting for
 * terminal handle after creation" and leaves no terminal behind, while the same
 * call without `--focus` succeeds and returns a handle.
 */
async function createTerminal(cwd, command) {
    const result = await orcaJson([
        "terminal",
        "create",
        "--worktree",
        `path:${cwd}`,
        "--command",
        command,
    ]);
    const handle = result.terminal?.handle;
    if (handle)
        await switchTerminal(handle);
}
async function openFileInOrca(path, cwd) {
    await orcaJson(["file", "open", "--path", path, "--worktree", `path:${cwd}`]);
}
/** The command that reopens a session where it left off. */
function resumeCommand(session) {
    return session.agent === "claude"
        ? `claude --resume ${session.id}`
        : `codex resume ${session.id}`;
}
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
/**
 * A pane may only claim a session it shares a working directory with, so live
 * sessions are keyed by directory *and* id. Without the directory, any pane
 * that merely printed a uuid — a log tail, a `--resume <id>` command typed
 * elsewhere, this extension's own output — would claim the session and send
 * Enter to an unrelated terminal. The key is built at both ends from the same
 * function, keeping the lookup a single O(1) `get` per rendered row; NUL cannot
 * occur in a path, so the two halves can never run together.
 */
function liveSessionKey(session) {
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
async function liveSessionHandles(terminals) {
    // Unanchored panes can never match a session, so they are dropped before the
    // fan-out: each preview costs a ~100ms subprocess.
    const anchored = terminals.filter((t) => t.worktreePath);
    const previews = await Promise.all(anchored.map(async (t) => {
        try {
            const full = await showTerminal(t.handle);
            return { terminal: t, preview: full.preview ?? "" };
        }
        catch {
            // Pane disappeared between list and show; its list preview is all we have.
            return { terminal: t, preview: t.preview ?? "" };
        }
    }));
    const found = new Map();
    for (const { terminal, preview } of previews) {
        for (const id of preview.match(UUID) ?? []) {
            const key = liveSessionKey({ id, cwd: terminal.worktreePath });
            if (!found.has(key))
                found.set(key, terminal.handle);
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
async function findTerminalForSession(session, terminals) {
    const candidates = terminals.filter((t) => t.worktreePath === session.cwd);
    const live = await liveSessionHandles(candidates);
    return live.get(liveSessionKey(session));
}
