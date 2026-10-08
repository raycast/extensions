import { execFile } from "child_process";
import { join } from "path";
import { environment, showToast, Toast, closeMainWindow } from "@raycast/api";

export type MirrorDirection = "mac" | "external";
export type MirrorSource = MirrorDirection | "off" | "toggle";

const execFilePromise = (file: string, args: string[]) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

export async function runMirrorAction(source: MirrorSource, toggleDirection?: MirrorDirection) {
  const scriptPath = join(environment.assetsPath, "mirror.swift");
  const args = source === "toggle" ? [source, toggleDirection ?? "mac"] : [source];
  try {
    await execFilePromise("swift", [scriptPath, ...args]);
    await showToast({ title: "Display mirroring configured", style: Toast.Style.Success });
    await closeMainWindow();
  } catch (err: unknown) {
    console.error(err);
    const e = err as { error?: Error; stdout?: string; stderr?: string };
    const output = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
    if (output.includes("No external displays detected")) {
      await showToast({ title: "No external display found", style: Toast.Style.Failure });
      return;
    }
    if (output.includes("Could not find the internal Mac display")) {
      await showToast({ title: "Internal display not found", style: Toast.Style.Failure });
      return;
    }
    const message = e.error?.message ?? String(err);
    await showToast({ title: "Failed to configure mirroring", message, style: Toast.Style.Failure });
  }
}
