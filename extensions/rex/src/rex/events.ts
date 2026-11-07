import { spawn, type ChildProcess } from "node:child_process";

const IGNORED_BLOCK_EVENTS = new Set([
  "bell",
  "clipboard_written",
  "selection_copied",
  "size_changed",
  "url_clicked",
  "desktop_notification",
]);
const IGNORED_TYPES = new Set(["client_joined", "client_left", "client_changed"]);
const DEBOUNCE_MS = 150;
const MAX_WAIT_MS = 750;
const RESTART_MS = 2_000;
const MAX_RESTART_MS = 30_000;

interface RexEvent {
  type?: string;
  payload?: { event?: { type?: string; payload?: { name?: string } } };
}

/** Ignore notifications that cannot change the session lists. Unknown events revalidate safely. */
export function eventMatters(line: string): boolean {
  let event: RexEvent | null;
  try {
    event = JSON.parse(line) as RexEvent | null;
  } catch {
    return false;
  }
  if (!event || typeof event.type !== "string" || IGNORED_TYPES.has(event.type)) return false;
  const inner = event.payload?.event;
  return !(inner?.type === "block_event" && inner.payload?.name && IGNORED_BLOCK_EVENTS.has(inner.payload.name));
}

/** Follow each CLI event stream until disposed, recovering from spawn failures and disconnects. */
export function subscribeToRexEvents(
  bin: string,
  targets: string[][],
  onChange: () => void | Promise<unknown>,
): () => void {
  let stopped = false;
  const children = new Set<ChildProcess>();
  const restarts = new Set<ReturnType<typeof setTimeout>>();
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let maxWait: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(debounce);
    clearTimeout(maxWait);
    debounce = maxWait = undefined;
    if (!stopped) {
      // The snapshot hook renders refresh failures; a stream must not create an unhandled rejection.
      void Promise.resolve()
        .then(onChange)
        .catch(() => undefined);
    }
  };
  const notify = () => {
    if (stopped) return;
    clearTimeout(debounce);
    debounce = setTimeout(flush, DEBOUNCE_MS);
    maxWait ??= setTimeout(flush, MAX_WAIT_MS);
  };

  const follow = (args: string[], retryDelay = RESTART_MS, reconnecting = false) => {
    if (stopped) return;
    const scheduleRestart = () => {
      if (stopped) return;
      const timer = setTimeout(() => {
        restarts.delete(timer);
        follow(args, Math.min(retryDelay * 2, MAX_RESTART_MS), true);
      }, retryDelay);
      restarts.add(timer);
    };
    let child: ChildProcess;
    try {
      child = spawn(bin, args, { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      scheduleRestart();
      return;
    }
    children.add(child);
    let buffer = "";
    let restarting = false;
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      retryDelay = RESTART_MS;
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      if (lines.some(eventMatters)) notify();
    });
    child.once("spawn", () => {
      // A new snapshot catches updates lost during the disconnected interval, even with polling off.
      if (reconnecting) notify();
    });
    const restart = () => {
      if (restarting) return;
      restarting = true;
      children.delete(child);
      if (child.pid && child.exitCode === null && !child.killed) child.kill();
      scheduleRestart();
    };
    // Failed spawns can emit both error and close. One guarded restart handles both paths.
    child.on("error", restart);
    child.once("close", restart);
  };

  for (const args of targets) follow(args);
  return () => {
    stopped = true;
    clearTimeout(debounce);
    clearTimeout(maxWait);
    for (const timer of restarts) clearTimeout(timer);
    for (const child of children) child.kill();
    restarts.clear();
    children.clear();
  };
}
