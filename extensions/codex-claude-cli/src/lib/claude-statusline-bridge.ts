import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  linkSync,
  lstatSync,
  openSync,
  readSync,
  renameSync,
  unlinkSync,
  type Stats,
} from "node:fs";
import { link, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { configHome, record } from "./claude-statusline-parsing";

interface BridgeLocation {
  claudeConfigDir?: string;
  bridgeDirectory: string;
}
interface BridgeInstall extends BridgeLocation {
  assetPath: string;
  nodePath: string;
}
interface Document {
  raw: string;
  value: Record<string, unknown>;
  mode: number;
  identity: string;
}
const MAX_BYTES = 1_048_576;
const OWNERLESS_LOCK_GRACE_MS = 60_000;
const identity = (info: Stats) => [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs, info.mode].join(":");

export function claudeBridgePaths(options: BridgeLocation) {
  const home = configHome(options.claudeConfigDir, process.env.CLAUDE_CONFIG_DIR, ".claude");
  const directory = join(options.bridgeDirectory, createHash("sha256").update(home).digest("hex").slice(0, 16));
  return {
    home,
    directory,
    settings: join(home, "settings.json"),
    state: join(directory, "state.json"),
    snapshot: join(directory, "usage.json"),
    script: join(directory, "statusline.cjs"),
  };
}

export async function readBridgeDocument(path: string): Promise<Document | undefined> {
  try {
    const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > MAX_BYTES) throw new Error("Invalid settings file");
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > MAX_BYTES) throw new Error("Settings too large");
      const raw = buffer.subarray(0, length).toString("utf8");
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid settings");
      if (identity(await handle.stat()) !== identity(info)) throw new Error("File changed while reading");
      return {
        raw,
        value: value as Record<string, unknown>,
        mode: info.mode & 0o777,
        identity: identity(info),
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (record(error).code === "ENOENT") return undefined;
    throw new Error("Claude Code settings could not be read safely. Check that settings.json contains valid JSON.");
  }
}

async function stageWrite(path: string, contents: string, mode = 0o600): Promise<string> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  } finally {
    await handle.close();
  }
  return temporary;
}

async function atomicWrite(path: string, contents: string, mode = 0o600) {
  const temporary = await stageWrite(path, contents, mode);
  try {
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

// Used only in short commit/lock sections. There are no asynchronous gaps between
// verifying the current inode/content and publishing the already-fsynced file.
function inspectFile(path: string): { raw: string; info: Stats } | undefined {
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
  } catch (error) {
    if (record(error).code === "ENOENT") return undefined;
    throw error;
  }
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > MAX_BYTES) throw new Error("Invalid file");
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > MAX_BYTES || identity(fstatSync(fd)) !== identity(info)) throw new Error("File changed");
    if (identity(lstatSync(path)) !== identity(info)) throw new Error("File replaced");
    return { raw: buffer.subarray(0, length).toString("utf8"), info };
  } finally {
    closeSync(fd);
  }
}

async function updateSettings(path: string, before: Document | undefined, value: Record<string, unknown>) {
  const temporary = await stageWrite(path, `${JSON.stringify(value, null, 2)}\n`, before?.mode);
  try {
    const current = inspectFile(path);
    if (current?.raw !== before?.raw || (current && identity(current.info)) !== before?.identity)
      throw new Error("Concurrent settings change");
    if (before) {
      // Node has no conditional rename primitive. Keep this check and rename in
      // the same synchronous section; an unrelated process can still race these
      // two OS calls, so this is optimistic conflict detection, not a file lease.
      renameSync(temporary, path);
    } else {
      // For a new settings file, exclusive link also detects a file created
      // between inspection and publication; it never overwrites that writer.
      linkSync(temporary, path);
    }
  } catch {
    throw new Error(
      "Claude settings changed while updating the connection. Please try again; your settings were left unchanged.",
    );
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function reclaimAbandonedLock(lockPath: string): boolean {
  const observed = inspectFile(lockPath);
  if (!observed) return true;
  let owner: Record<string, unknown> = {};
  try {
    owner = record(JSON.parse(observed.raw));
  } catch {
    /* A crashed legacy writer may leave no JSON. */
  }
  const pid = owner.pid;
  if (typeof pid === "number" && Number.isInteger(pid) && pid > 0) {
    try {
      process.kill(pid, 0);
      return false;
    } catch (error) {
      if (record(error).code !== "ESRCH") return false;
    }
  } else if (Date.now() - Math.max(observed.info.mtimeMs, observed.info.birthtimeMs) < OWNERLESS_LOCK_GRACE_MS) {
    return false;
  }
  const latest = inspectFile(lockPath);
  if (!latest) return true;
  if (latest.raw !== observed.raw || identity(latest.info) !== identity(observed.info)) return false;
  unlinkSync(lockPath);
  return true;
}

async function withLock<T>(directory: string, task: () => Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, "connect.lock");
  const token = randomUUID();
  // Publish a fully initialized lock with exclusive hard-link creation. Crashes
  // before publication leave only an unused temp file, never an ownerless lock.
  const staged = await stageWrite(lockPath, JSON.stringify({ pid: process.pid, token }));
  let acquired = false;
  try {
    try {
      await link(staged, lockPath);
      acquired = true;
    } catch (error) {
      if (record(error).code !== "EEXIST") throw error;
      if (reclaimAbandonedLock(lockPath)) {
        linkSync(staged, lockPath);
        acquired = true;
      }
    }
    if (!acquired) throw new Error("Lock held");
  } catch {
    throw new Error("Claude connection is already being updated. Please try again shortly.");
  } finally {
    await unlink(staged).catch(() => undefined);
  }
  try {
    return await task();
  } finally {
    try {
      const owner = inspectFile(lockPath);
      if (owner && record(JSON.parse(owner.raw)).token === token) unlinkSync(lockPath);
    } catch {
      /* Never remove a lock that another owner has replaced. */
    }
  }
}

export async function connectClaudeBridge(options: BridgeInstall): Promise<void> {
  const paths = claudeBridgePaths(options);
  await withLock(paths.directory, async () => {
    await mkdir(paths.home, { recursive: true, mode: 0o700 });
    const settings = await readBridgeDocument(paths.settings);
    const previousState = await readBridgeDocument(paths.state);
    const saved = previousState?.value.active === false ? undefined : previousState;
    const current = settings?.value.statusLine;
    if (saved && !same(current, saved.value.installed) && !same(current, saved.value.original))
      throw new Error(
        "Your Claude status line changed after connecting. Disconnect the old connection before reconnecting.",
      );
    const original = saved ? saved.value.original : current;
    if (original !== undefined && (record(original).type !== "command" || typeof record(original).command !== "string"))
      throw new Error("Your Claude status line uses an unsupported format. PromptCast has left it unchanged.");
    const fallback = typeof record(original).command === "string" ? record(original).command : "true";
    const command = `if [ -x ${quote(options.nodePath)} ] && [ -f ${quote(paths.script)} ]; then exec ${quote(options.nodePath)} ${quote(paths.script)} ${quote(paths.state)} ${quote(paths.snapshot)}; fi; ${fallback}`;
    const installed = { ...record(original), type: "command", command };
    const state = {
      version: 1,
      connectionId: randomUUID(),
      nodePath: options.nodePath,
      active: true,
      installed,
      hadOriginal: saved ? saved.value.hadOriginal : current !== undefined,
      ...(original !== undefined ? { original } : {}),
    };
    const script = await readFile(options.assetPath, "utf8");
    if (script.length > MAX_BYTES) throw new Error("Claude bridge asset is invalid.");
    await atomicWrite(paths.script, script);
    await atomicWrite(paths.state, `${JSON.stringify(state, null, 2)}\n`);
    await updateSettings(paths.settings, settings, { ...settings?.value, statusLine: installed });
  });
}

export async function disconnectClaudeBridge(options: BridgeLocation): Promise<void> {
  const paths = claudeBridgePaths(options);
  await withLock(paths.directory, async () => {
    const saved = await readBridgeDocument(paths.state);
    if (!saved) return;
    const settings = await readBridgeDocument(paths.settings);
    if (same(settings?.value.statusLine, saved.value.installed)) {
      const value = { ...settings?.value };
      if (saved.value.hadOriginal) value.statusLine = saved.value.original;
      else delete value.statusLine;
      await updateSettings(paths.settings, settings, value);
    }
    // If users replaced their status line, preserve that replacement. Keep the script so
    // an already running Claude process can finish safely; state removal disables quota collection.
    await atomicWrite(paths.state, `${JSON.stringify({ ...saved.value, active: false })}\n`);
    await unlink(paths.snapshot).catch(() => undefined);
  });
}
