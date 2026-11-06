import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { lockSync } from "proper-lockfile";

const STALE_MS = 600_000;

/** Identity guards also protect proper-lockfile's heartbeat and exit cleanup. */
export function acquireOwnedLock(target: string) {
  const lockPath = `${path.resolve(target)}.lock`;
  // The complete record is the filename: exclusive creation publishes PID and
  // identity together, without an empty/partially written JSON window.
  const ownerName = `owner-${process.pid}-${randomUUID()}`;
  const busy = () =>
    Object.assign(new Error("Storage lock owner is alive or unknown"), {
      code: "ELOCKED",
    });
  let captured = false;
  let owner: fs.Stats;
  let recovery: { identity: fs.Stats; name: string } | undefined;
  let compromised: Error | undefined;
  const sameIdentity = (left: fs.Stats, right: fs.Stats) =>
    left.ino === right.ino &&
    left.dev === right.dev &&
    left.birthtimeMs === right.birthtimeMs;
  const deadOwner = () => {
    const entries = fs.readdirSync(lockPath);
    if (entries.length !== 1) throw busy();
    const name = entries[0];
    const match =
      /^owner-([1-9][0-9]*)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.exec(
        name,
      );
    const pid = Number(match?.[1]);
    if (!Number.isSafeInteger(pid) || pid <= 0) throw busy();
    try {
      process.kill(pid, 0);
    } catch (error) {
      // EPERM, malformed records, and PID reuse must all retain exclusion.
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return name;
    }
    throw busy();
  };
  const assertIdentity = (file: fs.PathLike) => {
    if (!captured || file.toString() !== lockPath) return;
    const current = fs.statSync(lockPath);
    if (!sameIdentity(current, owner))
      throw Object.assign(new Error("Storage lock was replaced"), {
        code: "ENOENT",
      });
  };
  const lockFs = {
    ...fs,
    mkdirSync: ((...args: Parameters<typeof fs.mkdirSync>) => {
      const result = fs.mkdirSync(...args);
      if (args[0].toString() === lockPath) {
        owner = fs.statSync(lockPath);
        captured = true;
        // A crash before this marker exists leaves unknown ownership, which
        // deliberately blocks recovery rather than risking a live writer.
        fs.writeFileSync(path.join(lockPath, ownerName), "", {
          flag: "wx",
          mode: 0o600,
        });
      }
      return result;
    }) as typeof fs.mkdirSync,
    statSync: ((...args: Parameters<typeof fs.statSync>) => {
      assertIdentity(args[0]);
      const result = fs.statSync(...args);
      if (
        !captured &&
        result &&
        args[0].toString() === lockPath &&
        Date.now() - Number(result.mtimeMs) > STALE_MS
      ) {
        const identity = fs.statSync(lockPath);
        const name = deadOwner();
        if (!sameIdentity(identity, fs.statSync(lockPath))) throw busy();
        recovery = { identity, name };
      }
      return result;
    }) as typeof fs.statSync,
    rmdirSync: (...args: Parameters<typeof fs.rmdirSync>) => {
      assertIdentity(args[0]);
      if (args[0].toString() === lockPath) {
        if (!captured) {
          if (
            !recovery ||
            !sameIdentity(recovery.identity, fs.statSync(lockPath)) ||
            deadOwner() !== recovery.name
          )
            throw busy();
        }
        // Removing this unique marker is the claim to remove the directory.
        // A competing reaper must stop if another reaper removed it first;
        // it must never continue to a successor directory's removal.
        try {
          fs.unlinkSync(
            path.join(lockPath, captured ? ownerName : recovery!.name),
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") throw busy();
          throw error;
        }
      }
      return fs.rmdirSync(...args);
    },
    utimesSync: (...args: Parameters<typeof fs.utimesSync>) => {
      assertIdentity(args[0]);
      return fs.utimesSync(...args);
    },
  };
  const release = lockSync(target, {
    realpath: false,
    retries: 0,
    stale: STALE_MS,
    update: 1000,
    fs: lockFs,
    onCompromised: (error) => {
      compromised = error;
    },
  });
  const assertOwned = () => {
    if (compromised) throw compromised;
    assertIdentity(lockPath);
    if (Date.now() - fs.statSync(lockPath).mtimeMs > STALE_MS)
      throw new Error("Storage lock was lost");
  };
  return {
    assertOwned,
    release: () => {
      if (compromised) throw compromised;
      assertIdentity(lockPath);
      release();
    },
  };
}
