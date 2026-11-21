import { open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { fsearchOpened } from "./backends";
import { clock, type DigupHit } from "./query";

// The moment, the way DigUp's own app goes there: QuickTime Player is told the time (macOS asks once whether
// Raycast may control it). The time goes over as whole milliseconds, since a decimal point depends on locale.
const QUICKTIME = `
on run argv
  set theFile to POSIX file (item 1 of argv)
  set theTime to (item 2 of argv as integer) / 1000
  tell application "QuickTime Player"
    activate
    set theDocument to open theFile
    set current time of theDocument to theTime
    play theDocument
  end tell
end run`;

function openInQuickTime(file: string, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/bin/osascript",
      ["-e", QUICKTIME, file, String(Math.round(seconds * 1000))],
      { timeout: 15_000 },
      (error) => (error ? reject(error) : resolve()),
    );
  });
}

export async function openFile(file: string, hit?: DigupHit): Promise<void> {
  fsearchOpened(file);
  if (hit && (hit.kind === "video" || hit.kind === "audio") && hit.loc !== undefined && hit.loc > 0) {
    try {
      await openInQuickTime(file, hit.loc);
      await showHUD(`Opened at ${clock(hit.loc)}`);
      return;
    } catch {
      // Not allowed to control QuickTime, or it can't play this file: open it the plain way.
    }
  }
  await open(file);
}
