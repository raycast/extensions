import { ActionPanel, Detail, List, Action, Icon, useNavigation } from "@raycast/api";
import { useGraphsConfig } from "./utils";
import { NewGraph } from "./new-graph";
import GraphList, { graphList } from "./list";
import { GraphDetail } from "./detail";
import { removeGraphPeerUrlFromCache } from "./roamApi";

const GraphSelect = () => {
  const { graphsConfig } = useGraphsConfig();
  if (Object.keys(graphsConfig).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  return <GraphList />;
};

export default function Command() {
  const { graphsConfig, removeGraphConfig } = useGraphsConfig();
  // TODO: PROBLEM is that this does not update when we add a new graph??

  const { push } = useNavigation();
  return (
    <List>
      {graphList(
        graphsConfig,
        {
          onAction: (graphConfig: GraphConfig) => {
            push(<GraphDetail graphConfig={graphConfig} />);
          },
          title: "Available commands",
        },
        (graphName) => {
          removeGraphConfig(graphName);
          removeGraphPeerUrlFromCache(graphName);
        }
      )}
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
            {/* <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} /> */}
          </ActionPanel>
        }
      />
    </List>
  );
}
