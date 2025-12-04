import { environment, open } from "@raycast/api";
import { exec } from "child_process";

const sound = "mixkit-happy-crowd-cheer-975.wav";
const soundPath = `${environment.assetsPath}/${sound}`;
const macCommand = `afplay "${soundPath}"`;
const windowsCommand = `powershell -c "Add-Type -AssemblyName presentationCore; $player = New-Object system.windows.media.mediaplayer; $player.open('${soundPath.replace(/'/g, "''")}'); $player.Volume = 0.5; $player.Play(); Start-Sleep 1; Start-Sleep -s $player.NaturalDuration.TimeSpan.TotalSeconds;Exit;"`;

export function Shoot({ playSound }: { playSound: boolean }) {
  if (process.platform === "win32") {
    open("raycast://extensions/raycast/raycast/confetti");
  } else {
    open("raycast://confetti");
  }

  if (playSound) {
    const command = process.platform === "win32" ? windowsCommand : macCommand;

    exec(command, { windowsHide: true }, (error, stderr) => {
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

  return null;
}
