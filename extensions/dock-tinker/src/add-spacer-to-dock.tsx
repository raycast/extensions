import { spawnSync } from "child_process";
import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { getArgument, isEmpty } from "./utils/common-utils";

interface SpacerArguments {
  spacerStyle: string;
}

export default async (props: LaunchProps<{ arguments: SpacerArguments }>) => {
  await closeMainWindow();
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
