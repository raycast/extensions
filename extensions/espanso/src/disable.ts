import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  try {
    await new Promise<void>((resolve, reject) => {
      exec("espanso cmd disable", (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(stderr ?? error.message));
        } else {
          resolve();
        }
      });
    });
    await showHUD("Espanso disabled");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
