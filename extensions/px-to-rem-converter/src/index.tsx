import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import React, { useState } from "react";

interface Preferences {
  basePixel?: number;
}

const loadBasePixelsFromPreferences = () => {
  const basePixel = Number(getPreferenceValues<Preferences>().basePixel);
  if (isNaN(basePixel)) {
    return 16;
  }
  return basePixel;
};

const BASE_FONT_PIXELS = loadBasePixelsFromPreferences();

const toREM = (px: number): string => px / BASE_FONT_PIXELS + "rem";

const toPX = (rem: number) => rem * BASE_FONT_PIXELS + "px";

export default function Command() {
  const [rem, setREM] = useState<string>(toREM(BASE_FONT_PIXELS));
  const [px, setPX] = useState<string>(BASE_FONT_PIXELS + "px");

  const handleOnTextChange = (value = "") => {
    const input = Number(value.trim().split(" ")[0]);
    if (!isNaN(input)) {
      setREM(toREM(input));
      setPX(toPX(input));
    }
  };

  return (
    <List
      onSearchTextChange={handleOnTextChange}
      enableFiltering={false}
      navigationTitle="PX to REM"
      searchBarPlaceholder="Search your PX"
    >
      <List.Section title="to REM">
        <List.Item
          title={rem}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard title="Copy to clipboard" content={rem} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="to PX">
        <List.Item
          title={px}
          actions={
            <ActionPanel title="Copy">
              <Action.CopyToClipboard title="Copy to clipboard" content={px} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
