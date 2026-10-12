import { closeMainWindow, environment, open } from "@raycast/api";
import { execFile } from "node:child_process";
import { open as openFile, readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { run, settings, showError } from "./utils";

const exec = promisify(execFile);
const lockPath = join(environment.supportPath, "open-studio.lock");

async function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await openFile(lockPath, "wx");
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") throw error;
      if (attempt === 1) return;

      try {
        const lock = await stat(lockPath);
        if (Date.now() - lock.mtimeMs < 120_000) return;
        await unlink(lockPath);
      } catch (error) {
        if ((error as { code?: string }).code !== "ENOENT") throw error;
      }
    }
  }
}

async function findStudio(placeId: string) {
  const { stdout } = await exec("/bin/ps", ["-axo", "pid=,command="]);
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
      return {
        pid,
        ready:
          log.indexOf("[telemetryLog] State: PlaceIdle", placeIndex) >
          placeIndex,
      };
    }
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default async function Command() {
  const lock = await acquireLock();
  if (!lock) return;

  try {
    const { placeId, universeId } = settings("placeId", "universeId");
    let studio = await findStudio(placeId);

    if (studio?.ready) {
      await exec("/usr/bin/osascript", [
        "-l",
        "JavaScript",
        "-e",
        `ObjC.import("AppKit"); const app = $.NSRunningApplication.runningApplicationWithProcessIdentifier(${studio.pid}); if (!app) throw new Error(); app.activateWithOptions($.NSApplicationActivateAllWindows | $.NSApplicationActivateIgnoringOtherApps);`,
      ]);
      await closeMainWindow();
      return;
    }

    await run("Opening in Studio...", async () => {
      if (!studio) {
        await open(
          `roblox-studio:1+launchmode:edit+task:EditPlace+placeId:${placeId}+universeId:${universeId}`,
        );
      }
      await closeMainWindow();

      for (let attempt = 0; attempt < 120; attempt++) {
        await wait(500);
        studio = await findStudio(placeId);
        if (studio?.ready) return;
      }

      throw new Error("Studio is taking too long to open");
    });
  } catch (error) {
    await showError(error);
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => undefined);
  }
}
