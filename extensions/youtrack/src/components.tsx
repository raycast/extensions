import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, Color, Image } from "@raycast/api";
import { Issue } from "./interfaces";
import { issueStates } from "./utils";

const resolvedIcon = { source: Icon.Check, tintColor: Color.Green };
const openIcon = { source: Icon.Dot };

export function IssueListItem(props: { item: Issue; index: number; instance: string; resolved: boolean }) {
  const [state, setState] = useState<{ icon: Image; accessories: List.Item.Accessory[] }>({
    icon: { source: "" },
    accessories: [],
  });

  useEffect(() => {
    const icon = props.resolved ? resolvedIcon : openIcon;
    const tooltip = props.resolved ? issueStates.ISSUE_RESOLVED : issueStates.ISSUE_OPEN;
    const accessories = [{ text: props.item.id, tooltip }];
    setState({ icon, accessories });
  }, [props.item.id, props.resolved]);

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
          <Action.CopyToClipboard
            content={link}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
