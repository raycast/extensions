import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

import { capitalize } from "../utils/capitalize";
import { CUSTOM_CSS, CUSTOM_FIGMA, CUSTOM_MOTION } from "../utils/constants";
import { SpringValues } from "../utils/types";

export const customGridItem = (
  id: string,
  name: string,
  type: string,
  value: string | SpringValues,
  onDelete: (index: string) => void,
) => {
  const getTypeName = (type: string) => {
    if (type === "spring") return "Spring";
    if (type === "in-out") return "In Out";
    if (type === "in") return "In";
    if (type === "out") return "Out";
    return type.split("-").map(capitalize).join(" ");
  };

  const typeName = getTypeName(type);

  return (
    <Grid.Item
      title={name}
      subtitle={`Ease ${typeName}`}
      content={type === "spring" ? "custom-spring.svg" : `custom-ease-${type}.svg`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy CSS Value" content={CUSTOM_CSS(value, type)} />
          <Action.CopyToClipboard
            title="Copy Figma Value"
            content={CUSTOM_FIGMA(value, type)}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Motion Value"
            content={CUSTOM_MOTION(value, type)}
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
