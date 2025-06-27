import { exec } from "child_process";
import { join } from "path";

export function playSound(fileName: "todo.mp3" | "daily.mp3"): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = join(__dirname, `./assets/${fileName}`);
    const playSoundCommand = `afplay ${filePath}`;
    exec(playSoundCommand, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
