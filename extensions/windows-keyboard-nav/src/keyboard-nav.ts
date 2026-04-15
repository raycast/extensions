import { closeMainWindow, showHUD, environment, Clipboard } from "@raycast/api";
import { execFile } from "child_process";
import { join } from "path";

function getAssetScript(name: string): string {
  return join(environment.assetsPath, name);
}

function runPowerShell(
  scriptPath: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      "powershell.exe",
      [
        "-Sta",
        "-NonInteractive",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
      ],
      { timeout: 0 },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: string) => (stdout += d));
    proc.stderr?.on("data", (d: string) => (stderr += d));

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(Object.assign(new Error(`exit ${code}`), { code, stderr }));
      }
    });
    proc.on("error", reject);
  });
}

export default async function Command() {
  await closeMainWindow();
  await new Promise((r) => setTimeout(r, 350));

  const scriptPath = getAssetScript("hint-overlay.ps1");

  try {
    await runPowerShell(scriptPath);
  } catch (err: unknown) {
    const error = err as { code?: number; stderr?: string };

    if (error.code === 1) return; // usuario canceló

    if (error.code === 2) {
      await showHUD("ℹ️ No interactive elements found in the active window");
      return;
    }

    const detail = (error.stderr ?? "").trim();
    await Clipboard.copy(`Error Code: ${error.code}\n\nStderr:\n${detail}`);
    await showHUD(
      "❌ " +
        (detail || "Error " + error.code).substring(0, 50) +
        " (Error copied)",
  }
}
