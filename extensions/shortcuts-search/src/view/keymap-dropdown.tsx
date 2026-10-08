import { List } from "@raycast/api";
import React from "react";

export function KeymapDropdown(props: {
  keymaps: string[];
  value?: string;
  initialValue?: string;
  onKeymapChange: (newValue: string) => void;
}): React.JSX.Element | null {
  const { keymaps, value, initialValue, onKeymapChange } = props;
  if (keymaps.length == 1) {
    return null;
  }
  return (
    <List.Dropdown
      tooltip="Select Keymap"
      storeValue={!initialValue}
      value={value}
      defaultValue={initialValue}
      onChange={onKeymapChange}
    >
      <List.Dropdown.Section title="Keymaps">
        {keymaps.map((keymap) => (
          <List.Dropdown.Item key={keymap} title={keymap} value={keymap} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
