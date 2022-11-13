import { ActionPanel, Color, getPreferenceValues, Grid } from "@raycast/api";
import { ElementType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionFunction, Actions } from "../types";
import { actions } from "../utils/actions";
import { transformJsxToHtml } from "../utils/transforms";

type Preferences = {
  primaryAction: Actions;
  secondaryAction: Actions;
};

type Props = {
  icons: Record<string, ElementType>;
};

export function GridComponent({ icons }: Props) {
  const { primaryAction, secondaryAction } = getPreferenceValues<Preferences>();
  const {
    [primaryAction]: primaryPreferredAction,
    [secondaryAction]: secondaryPreferredAction,
    ...restActions
  } = actions;

  return (
    <Grid itemSize={Grid.ItemSize.Small} inset={Grid.Inset.Small}>
      {Object.entries(icons).map(([name, IconComponent]) => (
        <Grid.Item
          key={name}
          content={{
            value: {
              source: `data:image/svg+xml;base64,${btoa(transformJsxToHtml(renderToStaticMarkup(<IconComponent />)))}`,
              tintColor: Color.PrimaryText,
            },
            tooltip: name,
          }}
          title={name}
          actions={
            <ActionPanel>
              {primaryPreferredAction(name, IconComponent)}
              {secondaryPreferredAction(name, IconComponent)}
              {Object.values<ActionFunction>(restActions).map((action) => action(name, IconComponent))}
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
