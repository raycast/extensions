import { List, ActionPanel, Action, Icon, Color, getPreferenceValues, confirmAlert, Alert } from "@raycast/api";
import moment from "moment";
import { refreshCommands, pluralize, getEffectiveDate, getRepeatLabel } from "./utils";
import { Item, ListItems, Preferences } from "./types";
import { EditForm } from "./editForm";
import { getItems, saveItems } from "./storage";
import { useCachedPromise } from "@raycast/utils";

export default function Command() {
  const { data: datesList, isLoading, mutate } = useCachedPromise(getFormattedList, []);

  async function handleCreate(item: Item) {
    let items: Item[] = await getItems();
    items = items.filter((i) => i.id !== item.id);
    items.push(item);

    await saveItems(items);
    await mutate(getFormattedList());
    await refreshCommands();
  }

  async function removeItem(item: Item) {
    let items: Item[] = await getItems();
    items = items.filter((i) => i.id !== item.id);

    await saveItems(items);
    await mutate(getFormattedList());
    await refreshCommands();
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No dates added" description="Add a date to get started" />
      {datesList?.map((section) => {
        return (
          <List.Section
            title={section.title}
            key={section.title}
            subtitle={`${section.items.length} ${pluralize(section.items.length)}`}
          >
            {section.items.map((item: Item) => (
              <List.Item
                id={item.id}
                key={item.id}
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
  const { showDate, showCountdownByDay } = preferences;
  const items = [];
  const effectiveDate = getEffectiveDate(item);

  if (item.repeat && item.repeat !== "none") {
    items.push({
      tag: { value: getRepeatLabel(item.repeat), color: Color.Blue },
    });
  }

  if (showDate) {
    items.push({ text: effectiveDate.format("YYYY-MM-DD"), icon: Icon.Calendar });
  }

  if (showCountdownByDay) {
    items.push({ text: effectiveDate.diff(moment().startOf("day"), "days") + " days", icon: Icon.Clock });
  } else {
    items.push({ text: effectiveDate.fromNow(), icon: Icon.Clock });
  }

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
          style={Action.Style.Destructive}
          onAction={async () => {
            await confirmAlert({
              title: "Remove item?",
              message: "Do you want to remove the selected item?",
              primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
                onAction: async () => {
                  await onItemRemove(item);
                },
              },
            });
          }}
        />
      </ActionPanel>
    </>
  );
}

export async function getFormattedList() {
  const items: Item[] = await getItems();
  const now = moment().startOf("day");
  const dates = [];

  // Pre-compute effective date once per item to avoid redundant calls during filter/sort
  const effectiveDateMap = new Map<string, moment.Moment>();
  for (const item of items) {
    effectiveDateMap.set(item.id, getEffectiveDate(item));
  }

  const futureDates = items.filter((item) => {
    const effective = effectiveDateMap.get(item.id)!;
    return effective.isSameOrAfter(now);
  });
  futureDates.sort((a, b) => {
    const aDate = effectiveDateMap.get(a.id)!;
    const bDate = effectiveDateMap.get(b.id)!;
    return aDate.diff(bDate);
  });
  dates.push({ title: "Upcoming Dates", items: futureDates } as ListItems);

  const pastDates = items.filter((item) => {
    const effective = effectiveDateMap.get(item.id)!;
    return effective.isBefore(now);
  });
  pastDates.sort((a, b) => {
    const aDate = effectiveDateMap.get(a.id)!;
    const bDate = effectiveDateMap.get(b.id)!;
    return bDate.diff(aDate);
  });

  dates.push({ title: "Past Dates", items: pastDates } as ListItems);
  return dates;
}
