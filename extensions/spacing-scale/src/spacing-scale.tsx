import React, { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";

// Array of predefined spacing values
const spacingValues: number[] = [
  1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96,
  112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320, 384, 448, 512,
  640, 768, 896, 1024,
];

// Main command component
export default function Command() {
  // Define the possible sort orders
  type SortOrder = "ascending" | "descending";
  // State for the current sort order, defaulting to "ascending"
  const [sortOrder, setSortOrder] = useState<SortOrder>("ascending");

  // Sort the spacing values based on the current sortOrder
  const sortedValues = [...spacingValues].sort((a, b) =>
    sortOrder === "ascending" ? a - b : b - a,
  );

  return (
    <List
      searchBarPlaceholder="Filter spacing values"
      // Accessory for the search bar to allow changing sort order
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort order"
          storeValue={true} // Persist the selected sort order
          value={sortOrder}
          onChange={(newValue) => setSortOrder(newValue as SortOrder)}
        >
          <List.Dropdown.Item title="Ascending" value="ascending" />
          <List.Dropdown.Item title="Descending" value="descending" />
        </List.Dropdown>
      }
    >
      {/* Map through the sorted values and create a List.Item for each */}
      {sortedValues.map((value) => (
        <List.Item
          key={value}
          title={String(value)} // Display the spacing value as the title
          actions={
            // Define actions available for each item
            <ActionPanel>
              <Action.Paste title="Paste" content={String(value)} />
              <Action.CopyToClipboard title="Copy" content={String(value)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
