import { Action, ActionPanel } from "@raycast/api";
import { XcodeDistribution } from "../lib/xcodes";

export function XcodeActionPanel(props: {
  xcode: XcodeDistribution;
  onAction: (result: boolean) => void;
}): JSX.Element {
  const xcode = props.xcode;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Version"
          content={xcode.version}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Build"
          content={xcode.build}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
