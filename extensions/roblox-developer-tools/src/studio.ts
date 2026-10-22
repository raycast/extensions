import { closeMainWindow, environment, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { open as openFile, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { run, settings, showError } from "./utils";

const exec = promisify(execFile);
const lockPath = join(environment.supportPath, "open-studio.lock");
// Allow Launch Services time to create the process. Once it exists, its state
// (not a timeout) determines whether another launch is allowed.
const lockTimeout = 30_000;

async function acquireLock(placeId: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await openFile(lockPath, "wx");
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") throw error;
      if (attempt === 1) return;

      try {
        const studio = await findStudio(placeId);
        if (studio?.opening) return;
        const lock = await stat(lockPath);
        if (!studio && Date.now() - lock.mtimeMs < lockTimeout) return;
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
  let opening: { pid: string; opening: boolean } | undefined;

  for (const process of processes) {
    const pid = process.match(/^\s*(\d+)\s+.*\/RobloxStudio(?:\s|$)/)?.[1];
    if (!pid) continue;
    const launchPlace = process.match(/\s--placeId\s+([1-9]\d*)(?:\s|$)/)?.[1];

    const crashHandler = processes.find((process) =>
      process.includes(`--studioPid ${pid} `),
    );
    const logPath = crashHandler?.match(
      /--attachment=attachment_[^=\s]+=["']?(.+?_Studio_.+?_last\.log)/,
    )?.[1];
    let log = "";
    if (logPath) {
      try {
        log = await readFile(logPath, "utf8");
      } catch {
        // The process arguments still identify a launch before logs are ready.
      }
    }

    const telemetryPlace = [
      ...log.matchAll(/\[telemetryLog\] placeid:\s*([1-9]\d*)/g),
    ].at(-1);
    const startedPlace = [
      ...log.matchAll(/open place \(identifier = ([1-9]\d*)\) \[start\]/g),
    ].at(-1);
    const currentPlace =
      (startedPlace?.index ?? -1) > (telemetryPlace?.index ?? -1)
        ? startedPlace
        : telemetryPlace;
    const placeIndex = currentPlace?.index ?? -1;
    const closedIndex = log.lastIndexOf("RobloxBasicDoc::closeDocument");
    if (currentPlace?.[1] === placeId && placeIndex > closedIndex) {
      const successIndex = log.lastIndexOf(
        "[telemetryLog] State: OpenPlaceSuccess",
      );
      if (successIndex > Math.max(closedIndex, startedPlace?.index ?? -1)) {
        return { pid, opening: false };
      }
      opening = { pid, opening: true };
    } else if (!currentPlace && closedIndex === -1 && launchPlace === placeId) {
      // Startup arguments are only a fallback before the first document. They
      // must not match an old place after the user switches or closes it.
      opening = { pid, opening: true };
    }
  }
  return opening;
}

export default async function Command() {
  let lock: Awaited<ReturnType<typeof acquireLock>>;
  let keepLock = false;
  try {
    await closeMainWindow();
    const { placeId, universeId } = settings("placeId", "universeId");
    lock = await acquireLock(placeId);
    if (!lock) {
      await showHUD("Studio is opening...");
      return;
    }
    // If discovery fails, report it rather than risk launching a duplicate.
    const studio = await findStudio(placeId);

    if (studio?.opening) {
      await showHUD("Studio is opening...");
      return;
    }

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
      // A new instance is required for --args when another place is open.
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
      // Preserve this across command invocations, including Raycast restarts.
      // acquireLock releases it when Studio is ready or a launch has exited.
      keepLock = true;
      return "Opening in Studio...";
    });
  } catch (error) {
    await showError(error);
  } finally {
    if (lock) {
      await lock.close();
      if (!keepLock) await unlink(lockPath).catch(() => undefined);
    }
  }
}
