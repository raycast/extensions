import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

/** A kernel lock held while stdin stays open; parent exit closes it automatically.
 * Keep the lock file: unlinking it could let callers lock different inodes. */
export async function withCatalogPlaybackLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });
  const lockPath = path.join(environment.supportPath, "catalog-playback.lock");
  const holder = spawn(
    "/usr/bin/lockf",
    ["-k", "-t", "0", lockPath, "/bin/sh", "-c", "printf 'locked\\n'; /bin/cat >/dev/null"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  const closed = new Promise<void>((resolve) => holder.once("close", () => resolve()));
  let stderr = "";
  holder.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });
  // An early lock failure closes stdin. The close/error events below report it.
  holder.stdin.on("error", () => undefined);
  const acquired = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out acquiring the catalog playback lock."));
      holder.kill("SIGTERM");
    }, 5_000);
    let output = "";
    holder.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("locked\n")) {
        clearTimeout(timer);
        resolve();
      }
    });
    holder.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    holder.once("close", (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          code === 75
            ? "Another catalog playback request is running. Wait for it to finish before retrying."
            : `Catalog playback lock exited unexpectedly (${code}): ${stderr.trim()}`,
        ),
      );
    });
  });
  try {
    await acquired;
    const result = await operation();
    if (holder.exitCode !== null || holder.signalCode !== null) {
      throw new Error("The catalog playback lock was interrupted.");
    }
    return result;
  } finally {
    holder.stdin.end();
    await closed;
  }
}
