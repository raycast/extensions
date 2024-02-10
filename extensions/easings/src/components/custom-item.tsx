import { Action, ActionPanel, Grid } from "@raycast/api";

import { CUSTOM_CSS, CUSTOM_FIGMA, CUSTOM_FRAMER } from "../utils/constants";

export const customGridItem = (name: string, easing: string) => {
  return (
    <Grid.Item
      title={name}
      content={`../assets/ease-in-out-sine.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Cubic Bezier Value" content={CUSTOM_CSS(easing)} />
          <Action.CopyToClipboard title="Copy Figma Easing Value" content={CUSTOM_FIGMA(easing)} />
          <Action.CopyToClipboard title="Copy Framer Motion Value" content={CUSTOM_FRAMER(easing)} />
        </ActionPanel>
      }
    />
  );
};
