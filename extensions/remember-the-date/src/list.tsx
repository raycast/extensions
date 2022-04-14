import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import moment from "moment";
import { pluralize } from "./utils";
import { Item, ListItems, Preferences } from "./types";
import { EditForm } from "./editForm";
import { getItems, saveItems } from "./storage";
import Accessory = List.Item.Accessory;

export default function Command() {
  const [connectionsList, setConnectionsList] = useState<ListItems[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setConnectionsList(await getFormattedList());
      setLoading(false);
    })();
  }, []);

  async function handleCreate(item: Item) {
    let items: Item[] = await getItems();
    items = items.filter((i) => i.id !== item.id);
    items.push(item);

    await saveItems(items);
    setConnectionsList(await getFormattedList());
  }

  async function removeItem(item: Item) {
    let items: Item[] = await getItems();
    items = items.filter((i) => i.id !== item.id);

    await saveItems(items);
    setConnectionsList(await getFormattedList());
  }

  return (
    <List isLoading={loading}>
      <List.EmptyView title="No dates added" description="Add a date to get started" />
      {connectionsList.map((section) => {
        return (
          <List.Section
            title={section.title}
            key={section.title}
            subtitle={`${section.items.length} ${pluralize(section.items.length)}`}
          >
            {section.items.map((item: Item) => (
              <List.Item
                id={item.id}
                key={item.name}
                icon={{ source: item.icon, tintColor: item.color }}
                title={item.name}
                subtitle={item.subtitle}
                actions={<Actions item={item} onEdit={handleCreate} onItemRemove={removeItem} />}
                accessories={Accessories(item)}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function Accessories(item: Item) {
  const preferences = getPreferenceValues<Preferences>();
  const { showDate } = preferences;
  const items = [];

  if (showDate) {
    items.push({ text: moment(item.date).format("YYYY-MM-DD"), icon: Icon.Calendar });
  }

  items.push({ text: moment(item.date).fromNow(), icon: Icon.Clock });

  return items;
}

function Actions({
  item,
  onEdit,
  onItemRemove,
}: {
  item: Item;
  onEdit: (item: Item) => Promise<void>;
  onItemRemove: (item: Item) => Promise<void>;
}) {
  return (
    <>
      <ActionPanel title="User Options">
        <Action.Push title="Edit Item" icon={Icon.Pencil} target={<EditForm item={item} onEdit={onEdit} />} />
        <Action
          title="Remove Item"
          icon={Icon.Trash}
          onAction={async () => {
            await onItemRemove(item);
          }}
        />
      </ActionPanel>
    </>
  );
}

async function getFormattedList() {
  const items: Item[] = await getItems();
  const now = new Date().getTime();
  const dates = [];

  const futureDates = items.filter((item) => Date.parse(item.date) > now);
  futureDates.sort(function (a, b) {
    return a.date > b.date ? 1 : a.date < b.date ? -1 : 0;
  });
  dates.push({ title: "Upcoming Dates", items: futureDates } as ListItems);

  const pastDates = items.filter((item) => Date.parse(item.date) < now);
  pastDates.sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  dates.push({ title: "Past Dates", items: pastDates } as ListItems);
  return dates;
}
