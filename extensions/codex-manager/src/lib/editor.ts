import { open } from "@raycast/api";
import { execFile } from "child_process";

export async function openInEditor(targetPath: string, editorPreference: "default" | "code"): Promise<void> {
  if (editorPreference === "code") {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("code", [targetPath], (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      return;
    } catch {
      // Fallback to default if code CLI is unavailable.
    }
  }

  await open(targetPath);
}
