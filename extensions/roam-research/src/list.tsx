import { ActionPanel, Action, Icon, List, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { useGraphConfigCache, graphConfigCache } from "./cache";
import { UpdateAction } from "./components";
import { GraphDetail } from "./detail";
import { keys } from "./utils";

export const graphList = (graphCache: CachedGraphMap, onAction: (graph: CachedGraph) => void) => {
  if (keys(graphCache).length === 0) {
    return <List.EmptyView icon={Icon.Tray} title="Please add graph first" />;
  }
  return keys(graphCache).map((key) => {
    return (
      <List.Item
        title={key}
        key={key}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.MagnifyingGlass}
              title="Detail"
              onAction={() => {
                onAction(graphCache[key]);
              }}
            />
            <UpdateAction graph={graphCache[key]} />
            <Action
              icon={Icon.Trash}
              title={"Delete"}
              onAction={async () => {
                await confirmAlert({
                  title: "Delete the graph?",
                  primaryAction: {
                    title: "Delete",
                    onAction() {
                      graphConfigCache.delete();
                    },
                    style: Alert.ActionStyle.Destructive,
                  },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  });
};

export default function Command() {
  const [graphCache] = useGraphConfigCache();
  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphCache, (graph) => {
        push(<GraphDetail graph={graph} />);
      })}
    </List>
  );
}
