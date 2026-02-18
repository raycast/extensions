import { execFile } from "node:child_process";

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function sendMacOSNotification({ title, message }: { title: string; message: string }): Promise<void> {
  const escapedTitle = escapeAppleScriptString(title);
  const escapedMessage = escapeAppleScriptString(message);
  const script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;

  await new Promise<void>((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-e", script], (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function sendMacOSBeep(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-e", "beep"], (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
