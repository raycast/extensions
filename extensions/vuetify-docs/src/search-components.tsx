import { ActionPanel, Action, List } from "@raycast/api";
import components from "./components";
import { ComponentFilter, ComponentFilterString } from "./types";
import { useState } from "react";

type State = {
  filter: ComponentFilter;
  searchText: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: ComponentFilter.ALL,
    searchText: "",
  });

  const filteredSections = (() => {
    if (state.filter === ComponentFilter.ALL) {
      return components ?? [];
    }

    return components?.filter((section) => section.title === state.filter) ?? [];
  })();

  return (
    <List
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Section"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as ComponentFilter }))}
        >
          {Object.keys(ComponentFilter).map((key) => (
            <List.Dropdown.Item
              key={key}
              title={ComponentFilter[key as ComponentFilterString]}
              value={ComponentFilter[key as ComponentFilterString]}
            />
          ))}
        </List.Dropdown>
      }
      filtering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      {filteredSections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Item
              key={item.title}
              title={item.title}
              icon="v-logo.png"
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard content={item.url} title="Copy URL" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
