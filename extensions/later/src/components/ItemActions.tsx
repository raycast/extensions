import React, { useCallback } from "react";
import { ListItem } from "../types/common";
import { Action, ActionPanel, Icon, Keyboard, getPreferenceValues } from "@raycast/api";
import { open_link_handler } from "../utils/handler";
import { Browser } from "../common/config";
import { PreferenceValue } from "../types/validate";

const ItemActions: React.FC<ListItem> = (props) => {
  const open_link_to_browser = useCallback(() => {
    const preferences = getPreferenceValues<PreferenceValue>();
    const browser = preferences.links_to ?? "chrome";
    const browser_name = Browser.find((item) => item.id === browser)?.name ?? "Google Chrome";
    open_link_handler({ url: props.url, browser_name: browser_name });
  }, []);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          shortcut={{ modifiers: ["cmd"], key: "." }}
          icon={Icon.Globe}
          title="Open in Browser"
          onAction={open_link_to_browser}
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
          shortcut={Keyboard.Shortcut.Common.Remove}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          title="Delete"
          onAction={() => props.delete(props.url)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default ItemActions;
