import { ReducedIssue } from "youtrack-rest-client";
import { useEffect, useState } from "react";
import { Action, ActionPanel, List } from "@raycast/api";
import { getIcon } from "./utils";

export function IssueListItem(props: { item: ReducedIssue; index: number; instance: string }) {
  const [state, setState] = useState<{ icon: string; accessories: List.Item.Accessory[] }>({
    icon: getIcon(100),
    accessories: [],
  });
  const identifier = `${props.item.project?.shortName}-${props.item.numberInProject}`;
  const date = new Date(props.item.updated ?? 0).toDateString();

  useEffect(() => {
    const icon = getIcon(props.index + 1);
    const accessories = [{ text: identifier }];
    setState({ icon, accessories });
  }, [props.item, props.index]);

  return (
    <List.Item
      icon={state.icon}
      title={props.item.summary ?? "No title"}
      subtitle={date}
      accessories={state.accessories}
      actions={<Actions item={props.item} instance={props.instance} />}
    />
  );
}

function Actions(props: { item: ReducedIssue; instance: string }) {
  const identifier = `${props.item.project?.shortName}-${props.item.numberInProject}`;
  const link = `${props.instance}/issue/${identifier}`;
  return (
    <ActionPanel title={props.item.summary}>
      <ActionPanel.Section>
        {link && <Action.OpenInBrowser url={link} />}
        {link && (
          <Action.CopyToClipboard content={identifier} title="Copy ID" shortcut={{ modifiers: ["cmd"], key: "." }} />
        )}
        {link && (
          <Action.CopyToClipboard content={link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
