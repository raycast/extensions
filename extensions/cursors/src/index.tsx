import { Grid, getPreferenceValues } from "@raycast/api";
import { getActions, cursors } from "./const";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const columns = parseInt(preferences.gridSize);

  return (
    <Grid columns={columns} inset={Grid.Inset.Large}>
      {cursors.map((cursor) => (
        <Grid.Item
          key={cursor.id}
          subtitle={cursor.name}
          content={{ value: `data:image/svg+xml;utf8,${cursor.svg}`, tooltip: cursor.name }}
          actions={getActions(cursor, preferences.primaryAction)}
        />
      ))}
    </Grid>
  );
}
