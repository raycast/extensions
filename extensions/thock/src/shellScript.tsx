import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export function shellScript(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        console.error(`🔴 Stderr: ${stderr}`);
        showHUD(`❌ Error: ${error.message}`);
        reject(error.message);
        return;
      }

      if (stderr) {
        console.error(`🔴 Stderr: ${stderr}`);
        showHUD(`⚠️ Stderr: ${stderr}`);
        reject(stderr);
        return;
      }

      resolve(stdout);
    });
  });
}
