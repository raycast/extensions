import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

import { capitalize } from "../utils/capitalize";
import { CUSTOM_CSS, CUSTOM_FIGMA, CUSTOM_FRAMER } from "../utils/constants";

export const customGridItem = (
  id: string,
  name: string,
  type: string,
  value: string,
  onDelete: (index: string) => void,
) => {
  const parseType = type.split("-");
  const typeName = `${capitalize(parseType[0]) + (parseType[1] ? " " + capitalize(parseType[1]) : "") + (parseType[2] ? " " + capitalize(parseType[2]) : "")}`;

  return (
    <Grid.Item
      title={name}
      subtitle={`Ease ${typeName}`}
      content={`custom-ease-${type}.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Cubic Bezier Value" content={CUSTOM_CSS(value)} />
          <Action.CopyToClipboard
            title="Copy Figma Easing Value"
            content={CUSTOM_FIGMA(value)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Framer Motion Value"
            content={CUSTOM_FRAMER(value)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Custom Easing"
            onAction={() => onDelete(id)}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    />
  );
};
