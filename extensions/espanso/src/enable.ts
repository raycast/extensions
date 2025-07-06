import { showHUD } from "@raycast/api";
import { exec } from "child_process";
const { getEspansoCmd } = require("./lib/utils");

export default async function main() {
  try {
    await new Promise<void>((resolve, reject) => {
      exec(`${getEspansoCmd()} cmd enable`, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(stderr ?? error.message));
        } else {
          resolve();
        }
      });
    });
    await showHUD("Espanso enabled");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
