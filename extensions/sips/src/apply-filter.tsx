import { Action, ActionPanel, List } from "@raycast/api";
import { applyFilter, filters } from "./filters";

export default function Command() {
  const listItems = filters.map((filter) => (
    <List.Item
      title={filter.name}
      subtitle={filter.description}
      key={filter.name}
      actions={
        <ActionPanel>
          <Action title={`Apply ${filter.name} Filter`} onAction={async () => await applyFilter(filter)} />
        </ActionPanel>
      }
    />
  ));

  return <List searchBarPlaceholder="Search filters...">{listItems}</List>;
}
