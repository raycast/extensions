import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { search } from "./api/search";
import { usePromise } from "@raycast/utils";

export default function SearchNode(props: LaunchProps<{ arguments: Arguments.SearchNode }>) {
  const { isLoading, data } = usePromise(async () => {
    const result = await search(props.arguments.alias);
    return result.search.node_results.results;
  });

  return (
    <List isLoading={isLoading}>
      {data?.map((node) => (
        <List.Item
          key={node.pubkey}
          title={node.alias}
          subtitle={`Channels: ${node.channel_amount}, Capacity: ${node.capacity / 100_000_000} `}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://amboss.space/node/${node.pubkey}`} />
              <Action.CopyToClipboard
                title="Copy Pubkey to Clipboard"
                content={node.pubkey}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
