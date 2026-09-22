import { spawn as nodeSpawn, execFile } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";
import { parseEventLines, PREDICATE } from "./log.ts";
import type { FocusEvent } from "./types.ts";

const exec = promisify(execFile);

export const ROTATE_BYTES = 8 * 1024 * 1024;

export const DEADMAN_MINUTES = 45;

export type CollectorPaths = {
  dir: string;
  out: string;
  err: string;
  pid: string;
};

export function collectorPaths(dir: string): CollectorPaths {
  return {
    dir,
    out: path.join(dir, "stream.ndjson"),
    err: path.join(dir, "stream.err"),
    pid: path.join(dir, "collector.pid"),
  };
}

export type CollectorStatus = {
  running: boolean;
  bytes: number;
  spawned?: boolean;
};

type CollectorDeps = {
  spawn: (paths: CollectorPaths) => number | null;
  isAlive: (pid: number) => Promise<boolean>;
};

export const COLLECTOR_MARKER = "foqus-collector-6";

export const MENU_BAR_DEEPLINK =
  "raycast://extensions/filipimiparebine/foqus-league/focus-menu-bar?launchType=background";

export const WRAPPER = `# ${COLLECTOR_MARKER}
echo "$$" > "$PIDFILE"
owner=$$
fifo="$PIDFILE.poke"
trap 'kill "$child" "$tailpid" "$watcher" 2>/dev/null; rm -f "$fifo"' EXIT INT TERM
log stream --predicate "$PRED" --level info --style ndjson >> "$OUT" 2>> "$ERR" &
child=$!
rm -f "$fifo"
if mkfifo "$fifo" 2>/dev/null; then
  tail -n 0 -F "$OUT" 2>/dev/null > "$fifo" &
  tailpid=$!
  while IFS= read -r _; do
    if [ "$(cat "$PIDFILE" 2>/dev/null)" != "$owner" ]; then
      kill "$tailpid" 2>/dev/null
      exit 0
    fi
    open -g "$POKE" 2>/dev/null
  done < "$fifo" &
  watcher=$!
fi
sleep 2
# Stop when the PID file is taken over, removed, or left untouched: every
# Foqus refresh touches it, so a disabled menu bar command lets us go.
while kill -0 "$child" 2>/dev/null; do
  if [ ! -f "$PIDFILE" ] || [ "$(cat "$PIDFILE" 2>/dev/null)" != "$owner" ]; then
    exit 0
  fi
  if [ -n "$(find "$PIDFILE" -mmin +${DEADMAN_MINUTES} 2>/dev/null)" ]; then
    exit 0
  fi
  sleep 30
done
`;

function defaultSpawn(paths: CollectorPaths): number | null {
  const child = nodeSpawn("/bin/sh", ["-c", WRAPPER], {
    detached: true,
    stdio: "ignore",
    env: {
      PATH: "/usr/bin:/bin",
      HOME: process.env.HOME,
      USER: process.env.USER,
      PRED: PREDICATE,
      OUT: paths.out,
      ERR: paths.err,
      PIDFILE: paths.pid,
      POKE: MENU_BAR_DEEPLINK,
    },
  });
  child.unref();
  return child.pid ?? null;
}

export function isOurCollector(psOutput: string): boolean {
  return psOutput.includes(COLLECTOR_MARKER);
}

async function defaultIsAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    const { stdout } = await exec("/bin/ps", ["-p", String(pid), "-o", "command="], { timeout: 5_000 });
    return isOurCollector(stdout);
  } catch {
    return false;
  }
}

const defaultDeps: CollectorDeps = { spawn: defaultSpawn, isAlive: defaultIsAlive };

async function readPid(paths: CollectorPaths): Promise<number | null> {
  try {
    const raw = await fs.readFile(paths.pid, "utf8");
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function fileSize(file: string): Promise<number> {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}

export async function collectorStatus(
  paths: CollectorPaths,
  deps: CollectorDeps = defaultDeps,
): Promise<CollectorStatus> {
  const pid = await readPid(paths);
  const running = pid !== null && (await deps.isAlive(pid));
  return { running, bytes: await fileSize(paths.out) };
}

async function touch(paths: CollectorPaths): Promise<void> {
  const now = new Date();
  await fs.utimes(paths.pid, now, now).catch(() => {});
}

const SPAWN_LOCK_STALE_MS = 30_000;

async function withSpawnLock<T>(paths: CollectorPaths, fn: () => Promise<T>): Promise<T | null> {
  const lock = `${paths.pid}.lock`;
  let handle: fs.FileHandle;
  try {
    handle = await fs.open(lock, "wx");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const age = Date.now() - (await fs.stat(lock).catch(() => ({ mtimeMs: 0 }))).mtimeMs;
    if (age < SPAWN_LOCK_STALE_MS) return null;
    await fs.rm(lock, { force: true });
    try {
      handle = await fs.open(lock, "wx");
    } catch {
      return null;
    }
  }
  try {
    return await fn();
  } finally {
    await handle.close();
    await fs.rm(lock, { force: true });
  }
}

export async function ensureCollector(
  paths: CollectorPaths,
  deps: CollectorDeps = defaultDeps,
): Promise<CollectorStatus> {
  const current = await collectorStatus(paths, deps);
  if (current.running) {
    await touch(paths);
    return current;
  }

  await fs.mkdir(paths.dir, { recursive: true });

  const started = await withSpawnLock(paths, async () => {
    const again = await collectorStatus(paths, deps);
    if (again.running) {
      await touch(paths);
      return again;
    }

    const pid = deps.spawn(paths);
    if (pid === null) return { running: false, bytes: again.bytes };

    await fs.writeFile(paths.pid, `${pid}\n`, "utf8");
    return { running: true, bytes: again.bytes };
  });
  if (started) return { ...started, spawned: true };

  await new Promise((resolve) => setTimeout(resolve, 500));
  return { ...(await collectorStatus(paths, deps)), spawned: true };
}

async function stopCollector(paths: CollectorPaths, deps: CollectorDeps = defaultDeps): Promise<void> {
  const pid = await readPid(paths);
  await fs.rm(paths.pid, { force: true });
  if (pid !== null && (await deps.isAlive(pid))) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

type StreamRead = {
  events: FocusEvent[];
  records: number;
  nextOffset: number;
  reset: boolean;
};

export async function readStream(paths: CollectorPaths, offset: number): Promise<StreamRead> {
  const size = await fileSize(paths.out);
  if (size === 0) return { events: [], records: 0, nextOffset: 0, reset: offset > 0 };

  let start = offset;
  let reset = false;
  if (size < offset) {
    start = 0;
    reset = true;
  }
  if (size === start) return { events: [], records: 0, nextOffset: start, reset };

  const handle = await fs.open(paths.out, "r");
  let chunk: Buffer;
  try {
    chunk = Buffer.alloc(size - start);
    await handle.read(chunk, 0, chunk.length, start);
  } finally {
    await handle.close();
  }

  const text = chunk.toString("utf8");
  const lastNewline = text.lastIndexOf("\n");
  if (lastNewline < 0) return { events: [], records: 0, nextOffset: start, reset };

  const complete = text.slice(0, lastNewline + 1);
  const consumedBytes = Buffer.byteLength(complete, "utf8");

  const { events, records } = parseEventLines(complete);
  return { events, records, nextOffset: start + consumedBytes, reset };
}

export async function rotateStream(paths: CollectorPaths, deps: CollectorDeps = defaultDeps): Promise<void> {
  await stopCollector(paths, deps);
  await fs.rm(`${paths.out}.1`, { force: true });
  try {
    await fs.rename(paths.out, `${paths.out}.1`);
  } catch {}
}
