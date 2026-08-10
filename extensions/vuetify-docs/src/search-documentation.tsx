import { ActionPanel, Action, List } from "@raycast/api";
import sections from "./sections";
import { SectionFilter, SectionFilterString } from "./types";
import { useState } from "react";

type State = {
  filter: SectionFilter;
  searchText: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    filter: SectionFilter.ALL,
    searchText: "",
  });

  const filteredSections = (() => {
    if (state.filter === SectionFilter.ALL) {
      return sections ?? [];
    }

    return sections?.filter((section) => section.title === state.filter) ?? [];
  })();

  return (
    <List
      searchText={state.searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Section"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as SectionFilter }))}
        >
          {Object.keys(SectionFilter).map((key) => (
            <List.Dropdown.Item
              key={key}
              title={SectionFilter[key as SectionFilterString]}
              value={SectionFilter[key as SectionFilterString]}
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
