import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import ToggleMinimalEffect = Arguments.ToggleMinimalEffect;
import { getArgument, isEmpty } from "./utils/common-utils";

export default async (props: LaunchProps<{ arguments: ToggleMinimalEffect }>) => {
  await closeMainWindow();
  await showToast({ title: "Toggling minimal effect", style: Toast.Style.Animated });
  const effect_ = getArgument(props.arguments.effect, `Effect`);
  const effect = isEmpty(effect_) ? "genie" : effect_;
  spawnSync(`defaults write com.apple.dock mineffect ${effect} && killall Dock`, { shell: true });
  const message = `💻 Set minimal effect to ${effect}`;
  await showHUD(message);
};
