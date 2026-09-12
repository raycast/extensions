import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import { useHistoryState } from "../store/history";
import HistoryView from "./HistoryView";

export default function HistoryList() {
  const navigation = useNavigation();
  const history = useHistoryState((state) => state.history.sort((a, b) => b.timestamp - a.timestamp));

  const removeHistoryItem = useHistoryState((state) => state.removeItem);
  const removeAllHistory = useHistoryState((state) => state.removeAll);

  const remove = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Item",
        message: "Are you sure you want to delete this history item?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      removeHistoryItem(id);
    }
  };

  const removeAll = async () => {
    if (
      await confirmAlert({
        title: "Clear All",
        message: "Are you sure you want to delete all history items?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      removeAllHistory();
    }
  };

  return (
    <List>
      <List.Section title="History">
        {history.map((item) => (
          <List.Item
            key={item.id}
            icon={{ source: Icon.Dot, tintColor: item.action.color }}
            title={item.prompt}
            subtitle={item.result}
            accessories={[
              {
                tag: {
                  color: Color.PrimaryText,
                  value: item.action.name,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Manage">
                  <Action title="View Details" icon={Icon.List} onAction={() => navigation.push(<HistoryView id={item.id} />)} />
                  <Action title="Delete" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => remove(item.id)} />
                  <Action title="Clear All" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => removeAll()} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
