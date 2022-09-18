import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { useFocusOptions } from "./hooks";

export default function Command() {
  const { filteredList, onAction, setSearchText } = useFocusOptions();

  return (
    <List
      enableFiltering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search a focus mode"
      searchBarPlaceholder="Search the focus mode you want to use"
    >
      {filteredList.map(({ name, isActive }) => (
        <List.Item
          key={name}
          title={name}
          icon={
            isActive
              ? {
                  source: Icon.Check,
                  tintColor: Color.Green,
                }
              : undefined
          }
          actions={
            <ActionPanel>
              <Action onAction={() => onAction(name)} title="Select" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
