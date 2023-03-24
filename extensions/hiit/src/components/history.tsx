import { ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { addItem, deleteItem, getItems } from "../storage";
import { Item } from "../types";
import { DeleteInterval } from "./actions/deleteInterval";
import { secondsToTime } from "../utils";
import { NoteFormView } from "./actions/noteFormView";
import { HISTORY_KEY } from "../constants";

export function History() {
  const [intervalList, setIntervalList] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function handleDelete(item: Item) {
    const items = await deleteItem(item, HISTORY_KEY);
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval deleted");
  }

  async function handleCreate(item: Item) {
    const items = await addItem(item, HISTORY_KEY);
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Note added");
  }

  useEffect(() => {
    (async () => {
      const items = await getItems(HISTORY_KEY);
      setIntervalList(items);
      setLoading(false);
    })();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search history..." navigationTitle="History" isShowingDetail>
      {intervalList.reverse().map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={historyAccessories(item)}
            actions={
              <ActionPanel>
                <NoteFormView item={item} onSave={handleCreate} />
                <DeleteInterval item={item} type="History" onDelete={handleDelete} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={item.finished ? "Finished" : "Cancelled"}
                        color={item.finished ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>

                    {item.date && (
                      <List.Item.Detail.Metadata.Label title="Date" text={new Date(item.date).toLocaleDateString()} />
                    )}
                    <List.Item.Detail.Metadata.Separator />

                    {item.finished && (
                      <>
                        <List.Item.Detail.Metadata.Label title="Warmup" text={secondsToTime(item.interval.warmup)} />
                        <List.Item.Detail.Metadata.Label
                          title="Cooldown"
                          text={secondsToTime(item.interval.cooldown)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="High Interval"
                          text={secondsToTime(item.interval.high)}
                        />
                        <List.Item.Detail.Metadata.Label title="Low Interval" text={secondsToTime(item.interval.low)} />
                        <List.Item.Detail.Metadata.Label title="Sets" text={item.interval.sets.toString()} />
                        <List.Item.Detail.Metadata.Label
                          title="Total Time"
                          text={secondsToTime(item.interval.totalTime)}
                        />
                        <List.Item.Detail.Metadata.Separator />
                      </>
                    )}

                    {item.note && <List.Item.Detail.Metadata.Label title="Note" text={item.note} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          ></List.Item>
        );
      })}
    </List>
  );
}

function historyAccessories(item: Item) {
  const historyAccessories = [];

  if (item.date) {
    const date = new Date(item.date);
    historyAccessories.push({ icon: Icon.Calendar, date: new Date(item.date), tooltip: date.toLocaleString() });
  }

  return [...historyAccessories];
}
