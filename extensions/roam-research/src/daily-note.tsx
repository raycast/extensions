import { List, Icon, Form, useNavigation } from "@raycast/api";
import { useGraphConfigCache } from "./cache";
import { DailyNoteDetail } from "./components";
import { graphList } from "./list";
import { keys } from "./utils";

export default function Command() {
  const [graphCache] = useGraphConfigCache();
  const { push } = useNavigation();
  if (keys(graphCache).length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="Please add graph first" />
      </List>
    );
  }
  if (keys(graphCache).length === 1) {
    const graph = graphCache[keys(graphCache)[0]];
    return <DailyNoteDetail graph={graph} />;
  }

  return (
    <List>
      {graphList(graphCache, (graph) => {
        push(<DailyNoteDetail graph={graph} />);
      })}
    </List>
  );
}
