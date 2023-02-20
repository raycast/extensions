import { List, Icon, ActionPanel, Action, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { graphConfigCache, useGraphAllBlocks, useGraphConfigCache } from "./cache";
import { AllBlocks, UpdateAction } from "./components";
import { graphList } from "./list";
import { keys } from "./utils";

const SearchDetail = ({ graph }: { graph: CachedGraph }) => {
  const { data } = useGraphAllBlocks(graph.nameField);
  return <AllBlocks blocks={data} graph={graph} isLoading={false} />;
};

export default function Command() {
  const [graphCache] = useGraphConfigCache();
  if (keys(graphCache).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  if (keys(graphCache).length === 1) {
    const graph = graphCache[keys(graphCache)[0]];
    return <SearchDetail graph={graph} />;
  }
  const { push } = useNavigation();
  return (
    <List>
      {graphList(graphCache, (graph) => {
        push(<SearchDetail graph={graph} />);
      })}
    </List>
  );
}
