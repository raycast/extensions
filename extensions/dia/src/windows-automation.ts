import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { join } from "path";

export type WindowsOperation =
  | "tabs"
  | "focused-tab"
  | "spaces"
  | "switch-space"
  | "focus-tab"
  | "close-tab"
  | "read-tab"
  | "new-tab"
  | "new-window"
  | "new-incognito-window";

/** Fixed script + base64 JSON arguments: user text never becomes PowerShell source. */
export function runWindowsAutomation<T>(operation: WindowsOperation, params: Record<string, unknown> = {}): Promise<T> {
  const request = Buffer.from(JSON.stringify({ ...params, operation }), "utf8").toString("base64");
  const executable = join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      [
        "-NoProfile",
        "-NonInteractive",
        "-Sta",
        "-File",
        join(environment.assetsPath, "windows-automation.ps1"),
        "-RequestBase64",
        request,
      ],
      { windowsHide: true, timeout: 15000, maxBuffer: 2 * 1024 * 1024, encoding: "utf8" },
      (error, stdout) => {
        try {
          const response = JSON.parse(stdout.trim().replace(/^\uFEFF/, "")) as {
            ok: boolean;
            result: T;
            error?: string;
          };
          if (!response.ok) return reject(new Error(response.error || "Dia Windows automation failed."));
          if (error) return reject(error);
          resolve(response.result);
        } catch {
          reject(
            new Error(
              error?.killed
                ? "Dia automation timed out. Close dialogs in Dia and try again."
                : "Could not run Dia's PowerShell helper. Check that Windows PowerShell is available and your script policy permits the bundled script.",
            ),
          );
        }
      },
    );
  });
}
