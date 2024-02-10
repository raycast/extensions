import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

import { CUSTOM_CSS, CUSTOM_FIGMA, CUSTOM_FRAMER } from "../utils/constants";

export const customGridItem = (
  id: string,
  name: string,
  type: string,
  value: string,
  onDelete: (index: string) => void,
) => {
  return (
    <Grid.Item
      title={name}
      subtitle={type}
      content={`../assets/custom-ease-${type}.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Cubic Bezier Value" content={CUSTOM_CSS(value)} />
          <Action.CopyToClipboard title="Copy Figma Easing Value" content={CUSTOM_FIGMA(value)} />
          <Action.CopyToClipboard title="Copy Framer Motion Value" content={CUSTOM_FRAMER(value)} />
          <Action icon={Icon.Trash} title="Delete Custom Easing" onAction={() => onDelete(id)} />
        </ActionPanel>
      }
    />
  );
};
