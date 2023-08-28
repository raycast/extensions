import { Grid, Color, ActionPanel, Action, Icon } from "@raycast/api";
import { FC } from "react";
import { Symbols } from "../..";
import { ContextProps } from "../../hooks/preview";

export type ItemProps = {
  id: Symbols;
  icon: Icon;
  title: string;
  color?: Color;
  context: ContextProps;
};

export const ItemField: FC<ItemProps> = (item) => {
  return (
    <Grid.Item
      id={item.id}
      keywords={[item.id]}
      content={{
        value: {
          source: item.icon,
          tintColor: item.color ?? Color.PrimaryText,
        },
        tooltip: item.title,
      }}
      actions={
        <ActionPanel>
          <Action
            title="Push"
            onAction={() => item.context?.onAction(item.id)}
          />
          <Action title="Paste" onAction={item.context?.onSubmit} />
          <Action
            title="Copy Text"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={item.context?.copyAndClose}
          />
          <Action
            title="Undo"
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => item.context?.onAction("undo")}
          />
          <Action
            title="Delete All Saves"
            onAction={item.context?.deleteAllSaves}
          />
        </ActionPanel>
      }
    />
  );
};
