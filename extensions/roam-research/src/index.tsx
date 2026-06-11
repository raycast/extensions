import { ActionPanel, List, Action, Icon, useNavigation } from "@raycast/api";
import { useGraphsConfig } from "./utils";
import { NewGraph, GeneralOnboardingDetail } from "./new-graph";
import { graphList } from "./list";
import { GraphDetail } from "./detail";

export default function Command() {
  const { graphsConfig, removeGraphConfig, saveGraphConfig, orderedGraphNames, moveGraph } = useGraphsConfig();

  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphsConfig, {
        onAction: (graphConfig: GraphConfig) => {
          push(<GraphDetail graphConfig={graphConfig} />);
        },
        title: "Available commands",
        removeGraph: (graphName) => {
          removeGraphConfig(graphName);
        },
        saveGraphConfig,
        orderedGraphNames,
        moveGraph,
      })}
      <List.Item
        title="Getting Started"
        icon={Icon.Book}
        actions={
          <ActionPanel>
            <Action.Push title="Getting Started" icon={Icon.Book} target={<GeneralOnboardingDetail />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="Add New Graph"
        actions={
          <ActionPanel>
            <Action.Push title="Add New Graph" target={<NewGraph parentSaveGraphConfig={saveGraphConfig} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
