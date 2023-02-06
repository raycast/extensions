import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { addItem, deleteItem, getItems } from "../storage";
import { Item } from "../types";
import { DeleteInterval } from "./actions/deleteInterval";
import { accessories } from "./accessories";
import { NoteForm } from "./noteForm";
import { secondsToTime } from "../utils";

export function History() {
  const [intervalList, setIntervalList] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function handleDelete(item: Item) {
    const items = await deleteItem(item, "history");
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval Deleted");
  }

  async function handleCreate(item: Item) {
    const items = await addItem(item, "history");
    setIntervalList(items);
    await showToast(Toast.Style.Success, "Interval Added");
  }

  useEffect(() => {
    (async () => {
      const items = await getItems("history");
      setIntervalList(items);
      setLoading(false);
    })();
  }, []);

  return (
    <List isLoading={loading} navigationTitle="History" isShowingDetail>
      {intervalList.reverse().map((item) => {
        return (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={historyAccessories(item)}
            actions={
              <ActionPanel>
                <DeleteInterval item={item} type="History" onDelete={handleDelete} />
                <Action.Push
                  title="Add Note"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <NoteForm
                      item={item}
                      onSave={async function (item: Item): Promise<void> {
                        await handleCreate(item);
                      }}
                    />
                  }
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={``}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={item.finished ? "Finished" : "Cancelled"}
                        color={item.finished ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>

                    <List.Item.Detail.Metadata.Label title="Date" text={new Date(item.date).toLocaleDateString()} />
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Total time" text={secondsToTime(item.interval.totalTime)} />

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
  /*
  if (item.date) {
    const date = new Date(item.date);
    historyAccessories.push({ icon: Icon.Calendar, date: new Date(item.date), tooltip: date.toLocaleString() });
  }
  */

  const tintedIcon = { source: Icon.Bubble, tintColor: Color.Red };
  historyAccessories.push(tintedIcon);

  /*
  // Push finished icon
  historyAccessories.push({
    source: Icon.XMarkCircle,
    tintColor: Color.Red,
  });
  */

  // historyAccessories.push({ icon: Icon.Clock, text: secondsToTime(item.interval.totalTime) });

  /*
  if (item.note) {
    historyAccessories.push({ icon: Icon.Document, tooltip: item.note, text: "" });
  }
  */

  return [...historyAccessories];
}
