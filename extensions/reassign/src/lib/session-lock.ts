import { environment } from "@raycast/api";
import { constants } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Darwin's stable open(2) flag is not exposed by Node's fs.constants.
// https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/fcntl.h
const O_EXLOCK = 0x00000020;
const WAIT_MS = 30_000;

export class SessionLockTimeoutError extends Error {
  constructor() {
    super("Another Reassign command is still updating the session. Try again.");
    this.name = "SessionLockTimeoutError";
  }
}

/** Hold the kernel lock until every awaited credential operation has settled. */
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  // O_EXLOCK is platform-specific. Never silently run the action unlocked.
  if (process.platform !== "darwin") throw new Error("Reassign session locking requires macOS");
  await mkdir(environment.supportPath, { recursive: true });
  const path = join(environment.supportPath, "oauth-session");
  const flags = constants.O_CREAT | constants.O_RDWR | constants.O_NONBLOCK | constants.O_NOFOLLOW | O_EXLOCK;
  const deadline = performance.now() + WAIT_MS;

  // Nonblocking acquisition keeps Node's filesystem workers free for the owner.
  // Only waiters time out: a live owner's lock never expires on sleep or a slow
  // Raycast setTokens/removeTokens/LocalStorage write, none of which is abortable.
  let handle;
  for (;;) {
    try {
      handle = await open(path, flags, 0o600);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EAGAIN" && code !== "EWOULDBLOCK") throw error;
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new SessionLockTimeoutError();
      await delay(Math.min(100, remaining));
    }
  }

  try {
    return await action();
  } finally {
    // Keep the file: unlinking would let another process lock a different inode.
    // Closing (or process exit) releases ownership; timestamps never do.
    await handle.close();
  }
}
