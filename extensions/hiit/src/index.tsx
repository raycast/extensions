import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { secondsToTime } from "./utils";
import { addItem, deleteItem, getItems } from "./storage";
import { Item } from "./types";
import { NewInterval } from "./components/actions/newInterval";
import { EditInterval } from "./components/actions/editInterval";
import { Timer } from "./components/timer";
import { DeleteInterval } from "./components/actions/deleteInterval";

export default function Command() {
  const [intervalList, setIntervalList] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function handleCreate(item: Item) {
    const items = await addItem(item);
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval Added");
  }

  async function handleDelete(item: Item) {
    const items = await deleteItem(item);
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval Deleted");
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
      searchBarPlaceholder="Search interval..."
      actions={
        <ActionPanel>
          <NewInterval onSave={handleCreate} />
        </ActionPanel>
      }
    >
      {intervalList.map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={accessories(item)}
            actions={
              <ActionPanel>
                <Action.Push title="Open Timer" icon={Icon.Clock} target={<Timer item={item} />} />
                <EditInterval item={item} onSave={handleCreate} />
                <DeleteInterval item={item} onDelete={handleDelete} />
                <ActionPanel.Section>
                  <NewInterval onSave={handleCreate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function accessories(item: Item) {
  const accessories = [
    { text: `${item.interval.high} / ${item.interval.low}`, icon: Icon.Crown, tooltip: "Intervals" },
    { text: `${item.interval.intervals}`, icon: Icon.ArrowLeftCircle, tooltip: "Total Intervals" },
  ];

  if (item.interval.warmup) {
    accessories.push({
      text: `${secondsToTime(item.interval.warmup)}`,
      icon: Icon.ArrowUpCircle,
      tooltip: "Warmup",
    });
  }

  if (item.interval.cooldown) {
    accessories.push({
      text: `${secondsToTime(item.interval.cooldown)}`,
      icon: Icon.ArrowDownCircle,
      tooltip: "Cooldown",
    });
  }

  return [
    ...accessories,

    {
      text: `${secondsToTime(item.interval.totalTime)}`,
      icon: Icon.Clock,
      tooltip: "Total Time",
    },
  ];
}
