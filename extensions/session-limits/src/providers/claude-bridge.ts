import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { configHome } from "./credentials";
import { record } from "./parsing";

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
}
const MAX_BYTES = 1_048_576;

export function claudeBridgePaths(options: BridgeLocation) {
  const home = configHome(options.claudeConfigDir, process.env.CLAUDE_CONFIG_DIR, ".claude");
  const directory = join(
    options.bridgeDirectory,
    createHash("sha256").update(home).digest("hex").slice(0, 16),
  );
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
      return { raw, value: value as Record<string, unknown>, mode: info.mode & 0o777 };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (record(error).code === "ENOENT") return undefined;
    throw new Error(
      "Claude Code settings could not be read safely. Check that settings.json contains valid JSON.",
    );
  }
}

async function atomicWrite(path: string, contents: string, mode = 0o600) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", mode);
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function withLock<T>(directory: string, task: () => Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, "connect.lock");
  const token = randomUUID();
  let handle;
  try {
    handle = await open(lockPath, "wx", 0o600);
  } catch {
    const owner = await readBridgeDocument(lockPath).catch(() => undefined);
    const pid = owner?.value.pid;
    let dead = false;
    if (typeof pid === "number" && Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
      } catch (error) {
        dead = record(error).code === "ESRCH";
      }
    }
    if (!dead || (await readBridgeDocument(lockPath))?.raw !== owner?.raw)
      throw new Error("Claude connection is already being updated. Please try again shortly.");
    await unlink(lockPath);
    try {
      handle = await open(lockPath, "wx", 0o600);
    } catch {
      throw new Error("Claude connection is already being updated. Please try again shortly.");
    }
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, token }));
    await handle.sync();
    return await task();
  } finally {
    await handle.close();
    const owner = await readBridgeDocument(lockPath).catch(() => undefined);
    if (owner?.value.token === token) await unlink(lockPath).catch(() => undefined);
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
    if (
      original !== undefined &&
      (record(original).type !== "command" || typeof record(original).command !== "string")
    )
      throw new Error(
        "Your Claude status line uses an unsupported format. Session Limits has left it unchanged.",
      );
    const command = `${quote(options.nodePath)} ${quote(paths.script)} ${quote(paths.state)} ${quote(paths.snapshot)}`;
    const installed = { ...record(original), type: "command", command };
    const state = {
      version: 1,
      active: true,
      installed,
      hadOriginal: saved ? saved.value.hadOriginal : current !== undefined,
      ...(original !== undefined ? { original } : {}),
    };
    const script = await readFile(options.assetPath, "utf8");
    if (script.length > MAX_BYTES) throw new Error("Claude bridge asset is invalid.");
    await atomicWrite(paths.script, script);
    await atomicWrite(paths.state, `${JSON.stringify(state, null, 2)}\n`);
    const latest = await readBridgeDocument(paths.settings);
    if (latest?.raw !== settings?.raw)
      throw new Error("Claude settings changed while connecting. Please try again.");
    await atomicWrite(
      paths.settings,
      `${JSON.stringify({ ...settings?.value, statusLine: installed }, null, 2)}\n`,
      settings?.mode,
    );
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
      const latest = await readBridgeDocument(paths.settings);
      if (latest?.raw !== settings?.raw)
        throw new Error("Claude settings changed while disconnecting. Please try again.");
      await atomicWrite(paths.settings, `${JSON.stringify(value, null, 2)}\n`, settings?.mode);
    }
    // If users replaced their status line, preserve that replacement. Keep the script so
    // an already running Claude process can finish safely; state removal disables quota collection.
    await atomicWrite(paths.state, `${JSON.stringify({ ...saved.value, active: false })}\n`);
    await unlink(paths.snapshot).catch(() => undefined);
  });
}
