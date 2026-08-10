import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import ToggleAutoHideDelay = Arguments.ToggleAutoHideDelay;
import { getArgument, isEmpty } from "./utils/common-utils";

export default async (props: LaunchProps<{ arguments: ToggleAutoHideDelay }>) => {
  await closeMainWindow();
  await showToast({ title: "Toggling auto hide delay", style: Toast.Style.Animated });
  const delay_ = getArgument(props.arguments.delay, `AutoHideDelay`);
  const delay = isEmpty(delay_) ? 0 : parseFloat(delay_);

  spawnSync(`defaults write com.apple.dock "autohide-delay" -float "${delay}" && killall Dock`, { shell: true });
  const message = delay === 0 ? "💻 Turn off auto-hide delay" : `💻 Set auto-hide delay to ${delay}s`;
  await showHUD(message);
};
