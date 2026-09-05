import fs from "node:fs";
import path from "node:path";
import { lockSync } from "proper-lockfile";
import { environment, showToast, Toast } from "@raycast/api";

const STALE_MS = 600_000;

/** Excludes indexing and data deletion across commands and action panels. */
export async function withIndexingLock<T>(
  work: (assertOwned: () => void) => Promise<T>,
  operation: "indexing" | "deletion" = "indexing",
): Promise<T | undefined> {
  const target = path.join(environment.supportPath, "google-drive-indexing");
  const lockPath = `${target}.lock`;
  let release: (() => void) | undefined;
  let compromised: Error | undefined;
  let owner: fs.Stats | undefined;
  const assertIdentity = (file: fs.PathLike) => {
    if (!owner || file.toString() !== lockPath) return;
    const current = fs.statSync(lockPath);
    if (
      current.ino !== owner.ino ||
      current.dev !== owner.dev ||
      current.birthtimeMs !== owner.birthtimeMs
    ) {
      throw Object.assign(new Error("Indexing lock was replaced"), {
        code: "ENOENT",
      });
    }
  };
  // Protect heartbeat, release, and process-exit cleanup after stale-lock recovery.
  const lockFs = {
    ...fs,
    statSync: ((...args: Parameters<typeof fs.statSync>) => {
      assertIdentity(args[0]);
      return fs.statSync(...args);
    }) as typeof fs.statSync,
    rmdirSync: (...args: Parameters<typeof fs.rmdirSync>) => {
      assertIdentity(args[0]);
      return fs.rmdirSync(...args);
    },
    utimesSync: (...args: Parameters<typeof fs.utimesSync>) => {
      assertIdentity(args[0]);
      return fs.utimesSync(...args);
    },
  };
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    release = lockSync(target, {
      realpath: false,
      retries: 0,
      stale: STALE_MS,
      update: 1000,
      fs: lockFs,
      onCompromised: (error) => {
        compromised = error;
      },
    });
    owner = fs.statSync(lockPath);
    const assertOwned = () => {
      if (compromised) throw compromised;
      assertIdentity(lockPath);
      const current = fs.statSync(lockPath);
      if (Date.now() - current.mtimeMs > STALE_MS) {
        throw new Error("Indexing lock was lost");
      }
    };
    return await work(assertOwned);
  } catch (error) {
    const busy =
      !release &&
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ELOCKED";
    await showToast({
      style: Toast.Style.Failure,
      title: busy
        ? operation === "deletion"
          ? "Data was not deleted"
          : "Google Drive data is busy"
        : operation === "deletion"
          ? "Data deletion stopped"
          : "Google Drive indexing stopped",
      message: busy
        ? "Wait for indexing or data deletion to finish, then retry. After a crash, try again in ten minutes."
        : operation === "deletion"
          ? "Some data may already have been removed. Try deleting again."
          : "Previously saved results are still available. Try indexing again.",
    });
  } finally {
    if (release && !compromised) {
      try {
        assertIdentity(lockPath);
        release();
      } catch {
        /* A lost lock must not replace the scan's status. */
      }
    }
  }
}
