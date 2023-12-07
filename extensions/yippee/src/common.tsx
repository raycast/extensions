import { environment, open } from "@raycast/api";
import { exec } from "child_process";

const sound = "yippee-tbh.mp3";
const command = `afplay "${environment.assetsPath + "/" + sound}"`;

export function Shoot({ playSound }: { playSound: boolean }) {
  open("raycast://confetti");

  if (playSound) {
    exec(command, (error, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
    });
  }

  return null;
}
