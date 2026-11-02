import { spawn } from "node:child_process";
import { Clipboard, closeMainWindow, PopToRootType } from "@raycast/api";

function writePasteboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pbcopy");
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy exited ${code}`));
    });
    child.stdin.end(text);
  });
}

function pasteAfterDelay(): void {
  const child = spawn(
    "osascript",
    [
      "-e",
      "delay 0.3",
      "-e",
      'tell application "System Events" to keystroke "v" using command down',
    ],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

export async function pasteIntoFrontApp(content: string): Promise<void> {
  await Clipboard.copy(content);
  await writePasteboard(content);
  pasteAfterDelay();
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
}
