import { spawnSync } from "child_process";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  await closeMainWindow({ clearRootSearch: false });
  const out = spawnSync("defaults read com.apple.dock orientation", { shell: true });
  const dockOrientation = String(out.output[1]).trim();
  const oldIndex = orientations.indexOf(dockOrientation);
  const newIndex = oldIndex + 1 >= orientations.length ? 0 : oldIndex + 1;
  spawnSync(`defaults write com.apple.dock orientation ${orientations[newIndex]} && killall Dock`, { shell: true });
  await showHUD("Current Dock orientation: " + orientationsTitle[newIndex]);
};

const orientations = ["left", "bottom", "right"];
const orientationsTitle = ["Left", "Bottom", "Right"];
