import { ActionPanel, Action, List } from "@raycast/api";
import sections from "./sections";
import { SectionFilter } from "./types";
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
          <List.Dropdown.Item title="All" value={SectionFilter.ALL} />
          <List.Dropdown.Item title="Introduction" value={SectionFilter.INTRODUCTION} />
          <List.Dropdown.Item title="Getting Started" value={SectionFilter.GETTING_STARTED} />
          <List.Dropdown.Item title="Features" value={SectionFilter.FEATURES} />
          <List.Dropdown.Item title="Styles and Animations" value={SectionFilter.STYLES_AND_ANIMATIONS} />
          <List.Dropdown.Item title="Common Concepts" value={SectionFilter.COMMON_CONCEPTS} />
          <List.Dropdown.Item title="Components" value={SectionFilter.COMPONENTS} />
          <List.Dropdown.Item title="API" value={SectionFilter.API} />
          <List.Dropdown.Item title="Directives" value={SectionFilter.DIRECTIVES} />
          <List.Dropdown.Item title="Labs" value={SectionFilter.LABS} />
          <List.Dropdown.Item title="Resources" value={SectionFilter.RESOURCES} />
          <List.Dropdown.Item title="About" value={SectionFilter.ABOUT} />
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
