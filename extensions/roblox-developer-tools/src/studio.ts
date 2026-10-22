import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { open as openFile, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
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
      /--attachment=attachment_[^=\s]+=["']?(.+?_Studio_.+?_last\.log)/,
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
      await showHUD("Studio is opening...");
      return;
    }
    // Log-based detection is only an optimization, never proof that launch failed.
    const studio = await findStudio(placeId).catch(() => undefined);

    if (studio) {
      try {
        await exec(
          "/usr/bin/osascript",
          [
            "-l",
            "JavaScript",
            "-e",
            `ObjC.import("AppKit"); const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${studio.pid}); if (!app || !app.activateWithOptions($.NSApplicationActivateAllWindows | $.NSApplicationActivateIgnoringOtherApps)) throw new Error("Couldn't focus Studio");`,
          ],
          { timeout: 3_000 },
        );
        return;
      } catch {
        // The process may have exited since detection. Open the place normally.
      }
    }

    await run("Opening in Studio...", async () => {
      // The nested protocol handler is also named RobloxStudio. Target the
      // editor's bundle ID so Launch Services cannot choose that helper.
      await exec(
        "/usr/bin/open",
        [
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
      return "Opening in Studio...";
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
