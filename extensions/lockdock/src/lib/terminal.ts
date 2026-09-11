import { showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";

export function runInTerminal(command: string) {
  const escaped = command.replace(/"/g, '\\"');
  execFile(
    "/usr/bin/osascript",
    ["-e", `tell application "Terminal" to do script "${escaped}"`, "-e", 'tell application "Terminal" to activate'],
    (err) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open Terminal",
          message: err.message,
        });
      }
    },
  );
}
