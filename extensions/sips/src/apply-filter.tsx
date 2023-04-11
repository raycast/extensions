import { Action, ActionPanel, Grid } from "@raycast/api";
import { applyFilter, filters } from "./filters";

export default function Command() {
  const gridItems = filters.map((filter) => (
    <Grid.Item
      title={filter.name}
      subtitle={filter.description}
      key={filter.name}
      content={{ source: filter.thumbnail }}
      actions={
        <ActionPanel>
          <Action title={`Apply ${filter.name} Filter`} onAction={async () => await applyFilter(filter)} />
        </ActionPanel>
      }
    />
  ));

  return <Grid searchBarPlaceholder="Search filters...">{gridItems}</Grid>;
}
