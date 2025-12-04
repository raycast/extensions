import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getArgument, isEmpty } from "./utils/common-utils";
import ToggleDockSize = Arguments.ToggleDockSize;

export default async (props: LaunchProps<{ arguments: ToggleDockSize }>) => {
  await closeMainWindow();
  await showToast({ title: "Toggling Dock size", style: Toast.Style.Animated });
  const dockSize_ = getArgument(props.arguments.dockSize, `Orientation`);
  const dockSize = isEmpty(dockSize_) ? "48" : dockSize_;

  spawnSync(`defaults write com.apple.dock "tilesize" -int "${dockSize}" && killall Dock`, { shell: true });
  await showHUD(`💻 Set Dock size to ${dockSize}`);
};
