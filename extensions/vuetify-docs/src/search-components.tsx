import { ActionPanel, Action, List } from "@raycast/api";
import components from "./components";
import { ComponentFilter } from "./types";
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
          <List.Dropdown.Item title="All" value={ComponentFilter.ALL} />
          <List.Dropdown.Item title="Containment" value={ComponentFilter.CONTAINMENT} />
          <List.Dropdown.Item title="Navigation" value={ComponentFilter.NAVIGATION} />
          <List.Dropdown.Item title="Form inputs and controls" value={ComponentFilter.FORM_INPUTS_CONTROLS} />
          <List.Dropdown.Item title="Layouts" value={ComponentFilter.LAYOUTS} />
          <List.Dropdown.Item title="Selection" value={ComponentFilter.SELECTION} />
          <List.Dropdown.Item title="Data and display" value={ComponentFilter.DATA_DISPLAY} />
          <List.Dropdown.Item title="Feedback" value={ComponentFilter.FEEDBACK} />
          <List.Dropdown.Item title="Images and icons" value={ComponentFilter.IMAGES_ICONS} />
          <List.Dropdown.Item title="Pickers" value={ComponentFilter.PICKERS} />
          <List.Dropdown.Item title="Providers" value={ComponentFilter.PROVIDERS} />
          <List.Dropdown.Item title="Miscellaneous" value={ComponentFilter.MISCELLANEOUS} />
        </List.Dropdown>
      }
      filtering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      {filteredSections.map((section, index) => (
        <List.Section key={index} title={section.title}>
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
