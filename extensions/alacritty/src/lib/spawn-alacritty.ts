import { spawn } from "child_process";
import { getAlacrittyPreferences } from "../utils/get-alacritty-preferences";

export const spawnAlacritty = (args: string[]) =>
  new Promise((resolve, reject) => {
    const { alacrittyPath } = getAlacrittyPreferences();

    const alacritty = spawn(alacrittyPath, args);
    alacritty.on("error", (error) => {
      if (error.message.includes("ENOENT")) {
        reject(new Error(`Alacritty not found at path: ${alacrittyPath}`));
        return;
      }

      reject(error);
    });
    alacritty.stderr.on("data", (data) => reject(new Error(data.toString())));
    alacritty.on("close", (code) => resolve(code));
  });
