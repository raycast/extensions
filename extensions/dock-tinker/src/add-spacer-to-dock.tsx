import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { getArgument, isEmpty } from "./utils/common-utils";
import AddSpacerToDock = Arguments.AddSpacerToDock;

export default async (props: LaunchProps<{ arguments: AddSpacerToDock }>) => {
  await closeMainWindow();
  await showToast({ title: "Adding spacer to Dock", style: Toast.Style.Animated });
  const spacerStyle_ = getArgument(props.arguments.spacerStyle, `SpacerStyle`);
  const spacerStyle = isEmpty(spacerStyle_) ? "spacer-tile" : spacerStyle_;
  spawnSync(
    `defaults write com.apple.dock persistent-apps -array-add '{"tile-type"="${spacerStyle}";}' && killall Dock`,
    {
      shell: true,
    },
  );
  await showHUD("💻 Add spacer to Dock");
};
