import { useNavigation } from "@raycast/api";
import { List } from "@raycast/api";
import { useHistory } from "./hooks/useHistory";
import { Action, ActionPanel } from "@raycast/api";
import { ConnectionForm } from "./search-connection";

export default function Command() {
  const { push } = useNavigation();
  const { data, removeHistory, isLoading } = useHistory();
  return (
    <List isLoading={isLoading}>
      {data &&
        data.map((history) => (
          <List.Item
            key={history.timestamp}
            title={`${history.connection.from} to ${history.connection.to}`}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => push(<ConnectionForm value={history.connection} />)} />
                <Action title="Delete" onAction={() => removeHistory(history)} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
