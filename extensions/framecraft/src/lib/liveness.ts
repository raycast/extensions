import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Raycast runs every command of an extension inside one host process, so a PID
 * cannot tell a live command from one Raycast has unloaded. Each loaded command
 * gets its own owner ID and keeps a heartbeat file fresh while it holds work;
 * an owner whose heartbeat is stale is treated as gone.
 */
export const OWNER_ID = `${process.pid}-${randomUUID()}`;

const HEARTBEAT_MS = 2_000;
const STALE_MS = 15_000;

let heartbeatDir: string | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

function beat(): void {
  if (!heartbeatDir) return;
  const file = path.join(heartbeatDir, OWNER_ID);
  const now = new Date();
  try {
    fs.utimesSync(file, now, now);
  } catch {
    fs.mkdirSync(heartbeatDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, "", { mode: 0o600 });
  }
}

/** Start publishing this command's heartbeat. Safe to call repeatedly. */
export function startHeartbeat(supportPath: string): void {
  heartbeatDir = path.join(supportPath, "owners");
  beat();
  if (!timer) {
    timer = setInterval(beat, HEARTBEAT_MS);
    timer.unref?.();
  }
}

export function ownerAlive(supportPath: string, owner: string | undefined): boolean {
  if (!owner) return false;
  if (owner === OWNER_ID) return true;
  if (!/^\d+-[\da-f-]{36}$/.test(owner)) return false;
  const pid = Number.parseInt(owner, 10);
  try {
    process.kill(pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") return false;
  }
  try {
    return Date.now() - fs.statSync(path.join(supportPath, "owners", owner)).mtimeMs < STALE_MS;
  } catch {
    return false;
  }
}

/** Remove heartbeat files of owners that are long gone. */
export function pruneOwners(supportPath: string): void {
  const dir = path.join(supportPath, "owners");
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === OWNER_ID) continue;
    try {
      if (Date.now() - fs.statSync(path.join(dir, name)).mtimeMs > 10 * STALE_MS) fs.rmSync(path.join(dir, name));
    } catch {
      /* Raced with another prune. */
    }
  }
}

/**
 * Exclusive lock file owned by this command. A lock whose owner stopped
 * heartbeating is taken over. Returns undefined when a live owner holds it.
 */
export function tryAcquireLock(supportPath: string, file: string): (() => void) | undefined {
  startHeartbeat(supportPath);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.writeFileSync(file, OWNER_ID, { flag: "wx", mode: 0o600 });
      return () => {
        try {
          if (fs.readFileSync(file, "utf8") === OWNER_ID) fs.rmSync(file, { force: true });
        } catch {
          /* Already released. */
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    let owner = "";
    try {
      owner = fs.readFileSync(file, "utf8").trim();
    } catch {
      continue;
    }
    if (owner === OWNER_ID || ownerAlive(supportPath, owner)) return undefined;
    // Rename first so only one contender removes the stale record.
    const stale = `${file}.${OWNER_ID}.stale`;
    try {
      fs.renameSync(file, stale);
      if (fs.readFileSync(stale, "utf8").trim() === owner) fs.rmSync(stale, { force: true });
      else fs.renameSync(stale, file);
    } catch {
      /* Another contender handled it. */
    }
  }
  return undefined;
}

/** Wait for a lock, polling. */
export async function acquireLock(
  supportPath: string,
  file: string,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<{ release: () => void; waited: boolean }> {
  const deadline = Date.now() + timeoutMs;
  let waited = false;
  for (;;) {
    const release = tryAcquireLock(supportPath, file);
    if (release) return { release, waited };
    waited = true;
    if (Date.now() >= deadline) throw new Error(timeoutMessage);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
