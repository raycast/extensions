import { Action, ActionPanel, List } from "@raycast/api";
import { NodeResult } from "./api/types";

export default function NodeList(props: { nodes: Array<NodeResult> }) {
  return (
    <List>
      {props.nodes.map((node) => (
        <List.Item
          key={node.pubkey}
          title={node.alias}
          subtitle={`Channels: ${node.channel_amount}, Capacity: ${node.capacity / 100_000_000} `}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://amboss.space/node/${node.pubkey}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
