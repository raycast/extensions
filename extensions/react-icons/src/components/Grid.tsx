import { Action, ActionPanel, Color, Grid, getPreferenceValues } from "@raycast/api";
import { TIconPath } from "../types";

type Preferences = {
  primaryAction: "copyName" | "copyJSX" | "copySVG" | "pasteName" | "pasteJSX" | "pasteSVG";
  secondaryAction: "copyName" | "copyJSX" | "copySVG" | "pasteName" | "pasteJSX" | "pasteSVG";
}

type Props = {
  icons: Record<string, object>;
  path: TIconPath;
};

export function GridComponent({ icons, path }: Props) {
  const { primaryAction, secondaryAction } = getPreferenceValues<Preferences>();
  console.log("primaryAction: ", primaryAction);
  console.log("secondaryAction: ", secondaryAction);

  return (
    <Grid itemSize={Grid.ItemSize.Small} inset={Grid.Inset.Small}>
      {Object.keys(icons).map((name) => (
        <Grid.Item
          key={name}
          content={{ value: { source: `${path}/${name}.svg`, tintColor: Color.PrimaryText }, tooltip: name }}
          title={name}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Name" content={name} />
              <Action.Paste title="Paste Name" content={name} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
