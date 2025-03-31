import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import ToggleDockOrientation = Arguments.ToggleDockOrientation;
import { getArgument, isEmpty } from "./utils/common-utils";

export default async (props: LaunchProps<{ arguments: ToggleDockOrientation }>) => {
  await closeMainWindow();
  await showToast({ title: "Toggling Dock orientation", style: Toast.Style.Animated });
  const orientation_ = getArgument(props.arguments.orientation, `Orientation`);
  const orientation = isEmpty(orientation_) ? "bottom" : orientation_;

  spawnSync(`defaults write com.apple.dock orientation ${orientation} && killall Dock`, { shell: true });
  await showHUD(`💻 Set Dock orientation to ${orientation}`);
};
