import { MenuBarExtra, environment, open, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  const { confettiSound } = getPreferenceValues();
  return (
    <MenuBarExtra isLoading={false} icon="🎉">
      <Shoot playSound={confettiSound} />
    </MenuBarExtra>
  );
}

const sound = "mixkit-happy-crowd-cheer-975.wav";
const command = `afplay "${environment.assetsPath + "/" + sound}"`;

function Shoot({ playSound }: { playSound: boolean }) {
  open("raycast://confetti");

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

  return null;
}
