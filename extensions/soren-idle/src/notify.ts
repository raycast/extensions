import { execFile } from "node:child_process";

/** A macOS notification, for background commands that cannot show a toast. */
export function notify(title: string, message: string) {
  execFile(
    "osascript",
    [
      "-e",
      "on run argv",
      "-e",
      "display notification (item 1 of argv) with title (item 2 of argv)",
      "-e",
      "end run",
      message,
      title,
    ],
    () => undefined,
  );
}
