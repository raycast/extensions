import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import useSWR from "swr";
import { Node } from "./components";
import { workflowyFetcher } from "./fetch";

export default function Command() {
  const { data, error, mutate, isValidating } = useSWR("workflowy", workflowyFetcher);
  if (error) showToast({ style: Toast.Style.Failure, title: error.toString() });

  return (
    <List isLoading={isValidating}>
      {data?.favourites?.map((fav) => {
        if (fav.searchQuery) {
          const url =
            fav.zoomedProject.projectid != "None"
              ? `https://workflowy.com/#${fav.zoomedProject.projectid}?q=${encodeURIComponent(fav.searchQuery)}`
              : `https://workflowy.com/#?q=${encodeURIComponent(fav.searchQuery)}`;
          return (
            <List.Item
              icon={Icon.MagnifyingGlass}
              key={fav.searchQuery}
              title={fav.searchQuery}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={url} />
                  <Action.OpenInBrowser title="Open in Desktop App" url={`workflowy://${url}`} />
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Reload"
                    onAction={mutate}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        } else {
          const node = data.nodes[fav.zoomedProject.projectid];
          return node ? (
            <Node
              node={node}
              key={node.id}
              original={
                node.metadata?.mirror?.isMirrorRoot ? data?.nodes[node.metadata?.mirror?.originalId] : undefined
              }
              reload={mutate}
            />
          ) : null;
        }
      })}
    </List>
  );
}
