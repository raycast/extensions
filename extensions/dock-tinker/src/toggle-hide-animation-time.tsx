import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getArgument, isEmpty } from "./utils/common-utils";
import ToggleHideAnimationTime = Arguments.ToggleHideAnimationTime;

export default async (props: LaunchProps<{ arguments: ToggleHideAnimationTime }>) => {
  await closeMainWindow();
  await showToast({ title: "Toggling hide animation time", style: Toast.Style.Animated });
  const time_ = getArgument(props.arguments.delay, `HideAnimationTime`);
  const time = isEmpty(time_) ? 0 : parseFloat(time_);
  spawnSync(`defaults write com.apple.dock "autohide-time-modifier" -float "${time}" && killall Dock`, { shell: true });
  const message = time === 0 ? "💻 Turn off hide animation time" : `💻 Set hide animation time to ${time}s`;
  await showHUD(message);
};
