import { Action, ActionPanel, Icon } from "@raycast/api";
import { Pin, getPinStatistics } from "../../lib/Pins";

/**
 * Submenu for actions that copy information about a pin to the clipboard.
 * @param props.pin The pin to copy information about.
 * @param props.pins The list of pins to use for statistics.
 * @returns A submenu component.
 */
export default function CopyPinActionsSubmenu(props: { pin: Pin; pins: Pin[] }) {
  const { pin, pins } = props;

  return (
    <ActionPanel.Submenu title="Clipboard Actions" icon={Icon.Clipboard}>
      <Action.CopyToClipboard
        title="Copy Pin Name"
        content={pin.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Pin Target"
        content={pin.url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      />
      <Action.CopyToClipboard
        title="Copy Pin ID"
        content={pin.id.toString()}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action.CopyToClipboard
        title="Copy Pin JSON"
        content={JSON.stringify(pin)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
      />
      <Action.CopyToClipboard
        title="Copy Formatted Pin Statistics"
        content={getPinStatistics(pin, pins) as string}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.CopyToClipboard
        title="Copy Pin Statistics as JSON"
        content={JSON.stringify(getPinStatistics(pin, pins, "object"))}
        shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "j" }}
      />
    </ActionPanel.Submenu>
  );
}
