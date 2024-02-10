import { Action, ActionPanel, Grid } from "@raycast/api";

import { CSS, FIGMA, FRAMER, FRAMER_CUSTOM } from "../utils/constants";

export const gridItem = (type: string, i?: string, o?: string) => {
  function capitalize(input: string) {
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  return (
    <Grid.Item
      title={"Ease " + capitalize(i || "") + " " + capitalize(o || "") + " " + capitalize(type)}
      content={`../assets/ease-${i ? i + "-" : ""}${o ? o + "-" : ""}${type}.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Cubic Bezier Value"
            content={CSS("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
          />
          <Action.CopyToClipboard
            title="Copy Figma Easing Value"
            content={FIGMA("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
          />
          <Action.CopyToClipboard
            title="Copy Framer Motion Basic Value"
            content={FRAMER("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
          />
          <Action.CopyToClipboard
            title="Copy Framer Motion Custom Value"
            content={FRAMER_CUSTOM("ease" + capitalize(i || "") + capitalize(o || "") + capitalize(type))}
          />
        </ActionPanel>
      }
    />
  );
};
