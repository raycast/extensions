import { Action, ActionPanel, Clipboard, Icon, showHUD } from "@raycast/api";
import { Pin } from "../../lib/Pins";
import { Group, getGroupStatistics } from "../../lib/Groups";

/**
 * Submenu for actions that copy information about a group to the clipboard.
 * @param props.group The group to copy information about.
 * @param props.groups The list of groups to use for statistics.
 * @param props.pins The list of pins to use for statistics.
 * @returns A submenu component.
 */
export default function CopyGroupActionsSubmenu(props: { group: Group; groups: Group[]; pins: Pin[] }) {
  const { group, groups, pins } = props;

  return (
    <ActionPanel.Submenu title="Clipboard Actions" icon={Icon.Clipboard}>
      <Action.CopyToClipboard
        title="Copy Group Name"
        content={group.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Group ID"
        content={group.id.toString()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action
        title="Copy Group JSON"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
        onAction={async () => {
          const data = {
            groups: [group],
            pins: pins.filter((pin: Pin) => pin.group == group.name),
          };

          const jsonData = JSON.stringify(data);
          await Clipboard.copy(jsonData);
          await showHUD("Copied JSON to Clipboard");
        }}
      />
      <Action.CopyToClipboard
        title="Copy Formatted Group Statistics"
        content={getGroupStatistics(group, groups, pins) as string}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy Group Statistics as JSON"
        content={JSON.stringify(getGroupStatistics(group, groups, pins, "object"))}
        shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
      />
    </ActionPanel.Submenu>
  );
}
