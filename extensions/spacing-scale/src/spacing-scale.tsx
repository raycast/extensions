import React, { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";

const spacingValues: number[] = [
  1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96,
  112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 384, 448, 512,
  640, 768, 896, 1024,
];

export default function Command() {
  type SortOrder = "ascending" | "descending";
  const [sortOrder, setSortOrder] = useState<SortOrder>("ascending");

  const sortedValues = [...spacingValues].sort((a, b) =>
    sortOrder === "ascending" ? a - b : b - a,
  );

  return (
    <List
      searchBarPlaceholder="Filter spacing values"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort order"
          storeValue={true}
          value={sortOrder}
          onChange={(newValue) => setSortOrder(newValue as SortOrder)}
        >
          <List.Dropdown.Item title="Ascending" value="ascending" />
          <List.Dropdown.Item title="Descending" value="descending" />
        </List.Dropdown>
      }
    >
      {sortedValues.map((value) => (
        <List.Item
          key={value}
          title={String(value)}
          actions={
            <ActionPanel>
              <Action.Paste title="Paste" content={String(value)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
