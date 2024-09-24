import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import type { ObliqueStrategy } from "./types";
import obliqueStrategies from "./oblique-strategies.json";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedEdition, setSelectedEdition] = useState<string>("all");

  const filteredStrategies = obliqueStrategies.filter((strategy: ObliqueStrategy) => {
    const matchesSearch = strategy.strategy.toLowerCase().includes(searchText.toLowerCase());
    const matchesEdition = selectedEdition === "all" || strategy.edition === parseInt(selectedEdition);
    return matchesSearch && matchesEdition;
  });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Edition"
          storeValue={true}
          onChange={(newValue) => setSelectedEdition(newValue)}
        >
          <List.Dropdown.Item title="All Editions" value="all" />
          <List.Dropdown.Item title="Edition 1" value="1" />
          <List.Dropdown.Item title="Edition 2" value="2" />
          <List.Dropdown.Item title="Edition 3" value="3" />
          <List.Dropdown.Item title="Edition 4" value="4" />
        </List.Dropdown>
      }
    >
      {filteredStrategies.map((strategy: ObliqueStrategy, index: number) => (
        <List.Item
          key={index}
          title={strategy.strategy}
          accessories={[{ tag: `Edition ${strategy.edition}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={strategy.strategy} />
              <Action.Paste content={strategy.strategy} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
