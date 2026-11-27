import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sshCommand, type Connection } from "./model";

const execFileAsync = promisify(execFile);
export type Terminal = "terminal" | "iterm" | "ghostty";

export async function connect(
  connection: Connection,
  terminal: Terminal,
): Promise<void> {
  if (terminal === "ghostty") {
    const script = `on run argv
 tell application "Ghostty"
 set cfg to new surface configuration
 set command of cfg to (item 1 of argv)
 set wait after command of cfg to true
 set newWindow to new window with configuration cfg
 activate
 end tell
end run`;
    await execFileAsync("/usr/bin/osascript", [
      "-e",
      script,
      sshCommand(connection),
    ]);
    return;
  }
  const script =
    terminal === "iterm"
      ? `on run argv\n tell application "iTerm"\n activate\n set newWindow to (create window with default profile)\n tell current session of newWindow to write text (item 1 of argv)\n end tell\nend run`
      : `on run argv\n tell application "Terminal"\n activate\n do script (item 1 of argv)\n end tell\nend run`;
  await execFileAsync("/usr/bin/osascript", [
    "-e",
    script,
    sshCommand(connection),
  ]);
}
