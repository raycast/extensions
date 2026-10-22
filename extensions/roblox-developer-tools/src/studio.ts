import { closeMainWindow, environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { open as openFile, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { setTimeout as wait } from "node:timers/promises";
import { run, settings, showError } from "./utils";

const exec = promisify(execFile);
const lockPath = join(environment.supportPath, "open-studio.lock");
const lockTimeout = 10_000;

async function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await openFile(lockPath, "wx");
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") throw error;
      if (attempt === 1) return;

      try {
        const lock = await stat(lockPath);
        if (Date.now() - lock.mtimeMs < lockTimeout) return;
        await unlink(lockPath);
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") throw error;
      }
    }
  }
}

async function findStudio(placeId: string) {
  const { stdout } = await exec("/bin/ps", ["-axo", "pid=,command="], {
    timeout: 3_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const processes = stdout.split("\n");

  for (const process of processes) {
    const pid = process.match(/^\s*(\d+)\s+.*\/RobloxStudio(?:\s|$)/)?.[1];
    if (!pid) continue;

    const crashHandler = processes.find((process) =>
      process.includes(`--studioPid ${pid} `),
    );
    const logPath = crashHandler?.match(
      /--attachment=attachment_[^=]+=([^ ]+_Studio_[^ ]+_last\.log)/,
    )?.[1];
    if (!logPath) continue;

    let log: string;
    try {
      log = await readFile(logPath, "utf8");
    } catch {
      continue;
    }

    const currentPlace = [
      ...log.matchAll(/\[telemetryLog\] placeid:\s*([1-9]\d*)/g),
    ].at(-1);
    const placeIndex = currentPlace?.index ?? -1;
    if (
      currentPlace?.[1] === placeId &&
      placeIndex > log.lastIndexOf("RobloxBasicDoc::closeDocument")
    ) {
      return { pid };
    }
  }
}

export default async function Command() {
  let lock: Awaited<ReturnType<typeof acquireLock>>;
  try {
    await closeMainWindow();
    const { placeId, universeId } = settings("placeId", "universeId");
    lock = await acquireLock();
    if (!lock) {
      await run("Studio is opening...", async () => {
        // Animated notifications disappear when their no-view command exits.
        // Observe the existing launch without starting another editor or
        // touching the lock owned by the first invocation.
        await wait(1_500);
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          if (await findStudio(placeId)) return "Opened in Studio";

          const activeLock = await stat(lockPath).catch((error) => {
            if ((error as { code?: string }).code === "ENOENT") return;
            throw error;
          });
          if (!activeLock || Date.now() - activeLock.mtimeMs >= lockTimeout) {
            throw new Error("Studio did not open. Try again.");
          }
          await wait(500);
        }
        throw new Error(
          "Studio did not open the place within 60 seconds. Try again.",
        );
      });
      return;
    }
    const studio = await findStudio(placeId);

    if (studio) {
      await exec(
        "/usr/bin/osascript",
        [
          "-l",
          "JavaScript",
          "-e",
          `ObjC.import("AppKit"); const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${studio.pid}); if (!app) throw new Error(); app.activateWithOptions($.NSApplicationActivateAllWindows | $.NSApplicationActivateIgnoringOtherApps);`,
        ],
        { timeout: 3_000 },
      );
      await closeMainWindow();
      return;
    }

    await run("Opening in Studio...", async () => {
      // The nested protocol handler is also named RobloxStudio. Target the
      // editor's bundle ID so Launch Services cannot choose that helper.
      await exec(
        "/usr/bin/open",
        [
          "-n",
          "-b",
          "com.Roblox.RobloxStudio",
          "--args",
          "--task",
          "EditPlace",
          "--placeId",
          placeId,
          "--universeId",
          universeId,
        ],
        { timeout: 5_000 },
      );
      // `open` succeeding only means macOS accepted the request. Confirm the
      // editor actually starts opening this place before reporting success.
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const now = new Date();
        await lock!.utimes(now, now);
        if (await findStudio(placeId)) return "Opened in Studio";
        await wait(500);
      }
      throw new Error(
        "Studio did not open the place within 60 seconds. Try again.",
      );
    });
  } catch (error) {
    await showError(error);
  } finally {
    if (lock) {
      await lock.close();
      await unlink(lockPath).catch(() => undefined);
    }
  }
}
