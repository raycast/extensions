import { environment, open } from "@raycast/api";
import { exec } from "child_process";

const sound = "mixkit-happy-crowd-cheer-975.wav";
const command = `afplay "${environment.assetsPath + "/" + sound}"`;
const CONFETTI_DEEPLINK = "raycast://extensions/raycast/raycast/confetti";

export function shootConfetti({ playSound, emojis }: { playSound: boolean; emojis?: string }) {
  const url = emojis ? `${CONFETTI_DEEPLINK}?emojis=${encodeURIComponent(emojis)}` : CONFETTI_DEEPLINK;
  open(url);

  if (playSound) {
    exec(command, (error, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
    });
  }
}
