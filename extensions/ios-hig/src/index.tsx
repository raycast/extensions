import { useState, useEffect } from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { matchSorter } from "match-sorter";
import fontSizes from "./fontSizes";

function SizeDropdown({
  size,
  onSizeChange,
}: {
  size: keyof typeof fontSizes;
  onSizeChange: (size: keyof typeof fontSizes) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Select Accessibility Size"
      value={size}
      onChange={(newValue) => {
        onSizeChange(newValue as keyof typeof fontSizes);
      }}
    >
      <List.Dropdown.Section title="Accessibility Size">
        {Object.keys(fontSizes).map((size) => (
          <List.Dropdown.Item key={size} title={size} value={size} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [size, setSize] = useState<keyof typeof fontSizes>("Large");
  const [filteredList, setFilteredList] = useState(fontSizes[size]);

  useEffect(() => {
    setFilteredList(
      matchSorter(fontSizes[size], searchText, {
        keys: ["name", "size", "weight"],
        sorter: (items) => {
          return items.sort((a, b) => b.item.size - a.item.size);
        },
      })
    );
  }, [size, searchText]);

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="iOS HIG Fonts"
      searchBarPlaceholder="Search fonts..."
      searchBarAccessory={<SizeDropdown size={size} onSizeChange={(size) => setSize(size)} />}
    >
      <List.Section title="Dynamic Type Size">
        {filteredList.map((item) => (
          <List.Item
            key={item.name}
            title={item.name}
            accessories={[{ text: item.weight }, { text: `${item.size}px` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Submenu icon={Icon.Text} title="Change Size">
                  {Object.keys(fontSizes).map((key) => (
                    <Action
                      key={key}
                      title={key}
                      icon={Icon.Text}
                      onAction={() => setSize(key as keyof typeof fontSizes)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel>
            }
            detail={<List.Item.Detail />}
          />
        ))}
      </List.Section>
    </List>
  );
}
