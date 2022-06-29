import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { getIcon } from "./utils";
import { Issue } from "./interfaces";

export function IssueListItem(props: { item: Issue; index: number; instance: string }) {
  const [state, setState] = useState<{ icon: string; accessories: List.Item.Accessory[] }>({
    icon: getIcon(100),
    accessories: [],
  });

  useEffect(() => {
    const icon = getIcon(props.index + 1);
    const accessories = [{ text: props.item.id }];
    setState({ icon, accessories });
  }, [props.item, props.index]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.summary}
      subtitle={props.item.date}
      accessories={state.accessories}
      actions={<Actions item={props.item} instance={props.instance} />}
    />
  );
}

function Actions(props: { item: Issue; instance: string }) {
  const link = `${props.instance}/issue/${props.item.id}`;
  return (
    <ActionPanel title={props.item.summary}>
      <ActionPanel.Section>
        {link && <Action.OpenInBrowser url={link} />}
        {link && (
          <Action.CopyToClipboard content={props.item.id} title="Copy ID" shortcut={{ modifiers: ["cmd"], key: "." }} />
        )}
        {link && (
          <Action.CopyToClipboard content={link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "," }} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
