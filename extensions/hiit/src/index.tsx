import { ActionPanel, Action, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { addItem, deleteItem, getItems } from "./storage";
import { Item } from "./types";
import { NewInterval } from "./components/actions/newInterval";
import { EditInterval } from "./components/actions/editInterval";
import { Timer } from "./components/timer";
import { DeleteInterval } from "./components/actions/deleteInterval";
import { HistoryView } from "./components/actions/historyView";
import { accessories } from "./components/accessories";

export default function Command() {
  const [intervalList, setIntervalList] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { pop } = useNavigation();

  async function handleCreate(item: Item) {
    const items = await addItem(item);
    setIntervalList(items);
    pop();
    await showToast(Toast.Style.Success, "Interval added");
  }

  async function handleDelete(item: Item) {
    const items = await deleteItem(item);
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval deleted");
  }

  useEffect(() => {
    (async () => {
      const items = await getItems();
      setIntervalList(items);
      setLoading(false);
    })();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search intervals..."
      actions={
        <ActionPanel>
          <NewInterval onSave={handleCreate} />
        </ActionPanel>
      }
    >
      <List.EmptyView title="No Intervals" description="Press ⌘+N to add an interval" icon="no-view.png" />
      {intervalList.map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={accessories(item)}
            actions={
              <ActionPanel>
                <Action.Push title="Open Interval" icon={Icon.Clock} target={<Timer item={item} />} />
                <EditInterval item={item} onSave={handleCreate} />
                <DeleteInterval item={item} type="Interval" onDelete={handleDelete} />
                <ActionPanel.Section>
                  <NewInterval onSave={handleCreate} />
                  <HistoryView />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
