import { Action, ActionPanel, Color, Grid } from "@raycast/api";
import { TIconPath } from "../types";

type Props = {
  icons: Record<string, object>;
  path: TIconPath;
}

export function GridComponent({ icons, path }: Props) {
  return (
    <Grid
      itemSize={Grid.ItemSize.Small}
      inset={Grid.Inset.Small}
    >
      {Object.keys(icons).map((name) => (
        <Grid.Item
          key={name}
          content={{ value: { source: `${path}/${name}.svg`, tintColor: Color.PrimaryText }, tooltip: name }}
          title={name}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={name} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}