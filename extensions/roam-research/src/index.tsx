import { ActionPanel, Detail, List, Action, Icon, useNavigation } from "@raycast/api";
import { useGraphConfigCache } from "./cache";
import { NewGraph } from "./new-graph";
import GraphList, { graphList } from "./list";
import { GraphDetail } from "./detail";

const GraphSelect = () => {
  const [graphCache, saveGraphCache] = useGraphConfigCache();
  if (Object.keys(graphCache).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  return <GraphList />;
};

export default function Command() {
  const [graphCache, saveGraphCache] = useGraphConfigCache();
  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphCache, (graph) => {
        push(<GraphDetail graph={graph} />);
      })}
      {/* <List.Item
        title="Select Graph"
        actions={
          <ActionPanel>
            <Action.Push title="Select a graph as default" target={<GraphSelect />} />
          </ActionPanel>
        }
      /> */}
      <List.Item
        icon="list-icon.png"
        title="Add New Graph"
        actions={
          <ActionPanel>
            <Action.Push title="Add New Graph" target={<NewGraph />} />
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
