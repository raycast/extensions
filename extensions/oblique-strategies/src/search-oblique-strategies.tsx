import { useState } from "react";
import { List, ActionPanel, Action, Icon, launchCommand, LaunchType } from "@raycast/api";
import type { ObliqueStrategy } from "./types";
import obliqueStrategies from "./oblique-strategies.json";

type ExtendedStrategy = ObliqueStrategy & { firstLine: string; rest: string };
export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedEdition, setSelectedEdition] = useState<string>("all");

  const filteredStrategies = obliqueStrategies
    .filter((strategy: ObliqueStrategy) => {
      const matchesSearch = strategy.strategy.toLowerCase().includes(searchText.toLowerCase());
      const matchesEdition = selectedEdition === "all" || strategy.edition === parseInt(selectedEdition);
      return matchesSearch && matchesEdition;
    })
    .sort((a: ObliqueStrategy, b: ObliqueStrategy) => a.strategy.localeCompare(b.strategy))
    .map((strategy: ObliqueStrategy) => {
      const firstLine = strategy.strategy.split("\n")[0];
      const rest = strategy.strategy.split("\n").slice(1).join(" ");
      return { ...strategy, firstLine, rest };
    });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Edition" storeValue={true} onChange={(newValue) => setSelectedEdition(newValue)}>
          <List.Dropdown.Item title="All Editions" value="all" />
          <List.Dropdown.Item title="Edition 1" value="1" />
          <List.Dropdown.Item title="Edition 2" value="2" />
          <List.Dropdown.Item title="Edition 3" value="3" />
          <List.Dropdown.Item title="Edition 4" value="4" />
        </List.Dropdown>
      }
    >
      {filteredStrategies.map((strategy: ExtendedStrategy, index: number) => (
        <List.Item
          key={index}
          title={strategy.firstLine}
          subtitle={strategy.rest}
          accessories={[{ tag: `Edition ${strategy.edition}`, tooltip: strategy.strategy }]}
          actions={
            <ActionPanel>
              <Action
                title="View Strategy"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  launchCommand({
                    name: "get-oblique-strategy",
                    type: LaunchType.UserInitiated,
                    context: { strategy },
                  });
                }}
              />
              <Action.CopyToClipboard content={strategy.strategy} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              <Action.Paste content={strategy.strategy} shortcut={{ modifiers: ["cmd"], key: "v" }} />
              <ActionPanel.Section>
                <Action
                  title="Random Strategy"
                  icon={Icon.Shuffle}
                  onAction={() => {
                    launchCommand({ name: "get-oblique-strategy", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
