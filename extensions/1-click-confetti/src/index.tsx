import { MenuBarExtra, environment, open } from "@raycast/api";
import { exec } from "child_process";

export default function Command() {
  return (
    <MenuBarExtra isLoading={false} icon="🎉">
      <Shoot />
    </MenuBarExtra>
  );
}

const sound = "mixkit-happy-crowd-cheer-975.wav";
const command = `afplay "${environment.assetsPath + "/" + sound}"`;

function Shoot() {
  open("raycast://confetti");
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

  return null;
}
