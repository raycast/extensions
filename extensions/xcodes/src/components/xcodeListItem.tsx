import { Color, Icon, List, Image } from "@raycast/api";
import { XcodeDistribution } from "../lib/xcodes";
import { XcodeActionPanel } from "./actionPanels";

export function XcodeListItem(props: { xcode: XcodeDistribution; onAction: () => void }): JSX.Element {
  const xcode = props.xcode;
  let tintColor = Color.SecondaryText;
  let tooltip: string | undefined = undefined;

  if (xcode.installed) {
    tintColor = Color.SecondaryText;
    tooltip = "Installed";
  }

  if (xcode.selected) {
    tintColor = Color.Green;
    tooltip = "Installed and selected";
  }

  const icon = { source: Icon.Checkmark, tintColor } as Image;

  return (
    <List.Item
      title={xcode.version}
      subtitle={xcode.build}
      accessories={[{ icon: tooltip ? icon : undefined, tooltip: tooltip }]}
      actions={<XcodeActionPanel xcode={xcode} onAction={props.onAction} />}
    />
  );
}
