import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { getEspansoCmd } from "./lib/utils";

export default async function main() {
  try {
    await new Promise<void>((resolve, reject) => {
      exec(`${getEspansoCmd()} cmd disable`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      });
    });
    await showHUD("Espanso disabled");
  } catch (error) {
    let message = "";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    await showHUD(`Error: ${message}`);
  }
}
