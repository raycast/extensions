import React from "react";
import { ListItem } from "../types/common";
import { Action, ActionPanel, Icon } from "@raycast/api";

const ItemActions: React.FC<ListItem> = (props) => {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          shortcut={{ modifiers: ["cmd"], key: "." }}
          icon={Icon.Globe}
          title="Open in Browser"
          url={props.url}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          icon={props.read ? Icon.Circle : Icon.Checkmark}
          title={props.read ? "Mark as Unread" : "Mark as Read"}
          onAction={() => props.update(props.url)}
        />
        <Action
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          icon={Icon.Trash}
          title="Delete"
          onAction={() => props.delete(props.url)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default ItemActions;
