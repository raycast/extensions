import { spawn } from "node:child_process";

// The kernel owns the lock. Never unlink the file: waiters must use the same inode.
const LOCK_HELPER = `
import fcntl, os, sys
fd = os.open(sys.argv[1], os.O_CREAT | os.O_RDWR, 0o600)
os.fchmod(fd, 0o600)
try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    print("BUSY", flush=True)
    sys.exit(2)
print("READY", flush=True)
sys.stdin.buffer.read()
`;

export type LifecycleLock = { assertHeld: () => void; release: () => Promise<void> };

export async function acquireLifecycleLock(file: string): Promise<LifecycleLock> {
  const child = spawn("/usr/bin/python3", ["-u", "-c", LOCK_HELPER, file], { stdio: ["pipe", "pipe", "pipe"] });
  let ended = false;
  let failure: Error | undefined;
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + String(chunk)).slice(-4096);
  });
  child.stdin.on("error", (error) => {
    failure = error;
  });
  const closed = new Promise<void>((resolve) => {
    child.once("close", () => {
      ended = true;
      resolve();
    });
    child.once("error", (error) => {
      failure = error;
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Router operation lock timed out.")), 5_000);
      let output = "";
      const finish = (error?: Error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      child.stdout.on("data", (chunk) => {
        output += String(chunk);
        if (output.includes("READY\n")) finish();
        else if (output.includes("BUSY\n"))
          finish(new Error("Another router operation is in progress. Try again shortly."));
      });
      child.once("error", finish);
      child.once("close", () =>
        finish(new Error(`Could not acquire router operation lock: ${stderr || "helper exited"}`)),
      );
    });
  } catch (error) {
    child.kill();
    await closed;
    throw error;
  }
  return {
    assertHeld() {
      if (ended || failure || child.exitCode !== null || child.signalCode !== null)
        throw new Error("Router operation lock was lost; retry the operation.");
    },
    async release() {
      child.stdin.end();
      const timer = setTimeout(() => child.kill(), 1_000);
      await closed;
      clearTimeout(timer);
    },
  };
}
