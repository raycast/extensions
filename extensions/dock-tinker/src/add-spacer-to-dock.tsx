import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow();
  spawnSync(
    'defaults write com.apple.dock persistent-apps -array-add \'{"tile-type"="spacer-tile";}\' && killall Dock',
    {
      shell: true,
    },
  );
  await showHUD("💻 Add spacer to Dock");
};
