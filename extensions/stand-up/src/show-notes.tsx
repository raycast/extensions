import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import dayjs, { Dayjs } from "dayjs";
import advanced from "dayjs/plugin/advancedFormat";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import isTomorrow from "dayjs/plugin/isTomorrow";
import isYesterday from "dayjs/plugin/isYesterday";
import relative from "dayjs/plugin/relativeTime";
import { useState } from "react";
import { deleteAllForDay, deleteEntry, EntryType, FORMAT_KEY, getDaysByDateDescending } from "./api";
import { CopyDayMarkdownAction } from "./utils/copy-markdown";
import { SummariseDayAction } from "./utils/summarise-day";
import ActionStyle = Alert.ActionStyle;
import { EditNoteAction } from "./components/edit-note";
import { useCachedPromise } from "@raycast/utils";

function NewNoteAction() {
  return (
    <Action
      icon={Icon.NewDocument}
      title="Create Note"
      onAction={() => {
        launchCommand({
          name: "index",
          type: LaunchType.UserInitiated,
          extensionName: "stand-up",
        });
      }}
    />
  );
}

dayjs.extend(advanced);
dayjs.extend(relative);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(isBetween);

function isThisWeek(date: Dayjs) {
  const startOfWeek = dayjs().startOf("week");
  const endOfWeek = dayjs().endOf("week");
  return date.isBetween(startOfWeek, endOfWeek);
}

export default function Command() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, revalidate } = useCachedPromise(
    async (filter: string) => {
      const resp = await getDaysByDateDescending();
      const filteredDayKeys = Object.keys(resp.days).filter((key) => {
        if (filter === "all") {
          return true;
        }
        return key === filter;
      });

      const filteredDays: (typeof resp)["days"] = {};

      filteredDayKeys.forEach((key) => {
        filteredDays[key] = resp.days[key];
      });

      return {
        days: filteredDays,
      };
    },
    [filter],
  );

  const keys = Object.keys(data?.days || {});

  const dropdownItems = [
    {
      value: dayjs().format(FORMAT_KEY),
      title: "Today",
    },
    {
      value: dayjs().subtract(1, "day").format(FORMAT_KEY),
      title: "Yesterday",
    },
  ];

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Your standup notes"
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip="Filter by day">
          <List.Dropdown.Item title="Show all" value="all" />
          {dropdownItems.map((d) => {
            return <List.Dropdown.Item key={d.title} {...d} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No notes yet, create one"
        icon={Icon.BlankDocument}
        actions={
          <ActionPanel>
            <NewNoteAction />
          </ActionPanel>
        }
      />
      {keys.map((key) => {
        const date = dayjs(key);

        const sectionTitle = getSectionTitle(date);

        const entries = data?.days[key] ? Object.values(data.days[key]) : [];

        return (
          <List.Section title={sectionTitle} key={key}>
            {entries.map((entry) => {
              const date = dayjs(entry.datetime);
              const time = date.format("HH:mm");

              const accessories = [];

              if (entry.type === EntryType.Meeting) {
                accessories.push({
                  tag: {
                    value: "Meeting",
                    color: Color.Blue,
                  },
                });
              }

              if (entry.type === EntryType.Blocker) {
                accessories.push({
                  tag: {
                    value: "Blocker",
                    color: Color.Red,
                  },
                });
              }

              return (
                <List.Item
                  key={date.toISOString()}
                  keywords={[entry.notes, entry.description || ""]}
                  accessories={[
                    ...accessories,
                    {
                      date: date.toDate(),
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <EditNoteAction entry={entry} />
                      <NewNoteAction />
                      <CopyDayMarkdownAction day={data?.days[key]} />
                      <SummariseDayAction day={data?.days[key]} />
                      <Action
                        shortcut={{
                          key: "backspace",
                          modifiers: ["cmd"],
                        }}
                        onAction={async () => {
                          await deleteEntry(entry.id);
                          revalidate();
                        }}
                        title="Delete"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                      />
                      <Action
                        shortcut={{
                          key: "backspace",
                          modifiers: ["cmd", "shift"],
                        }}
                        title="Delete All on Day"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const ok = await confirmAlert({
                            title: "Are you sure?",
                            message: "This will delete all entries for this day, and they cannot be recovered",
                            primaryAction: {
                              title: "Delete all",
                              style: ActionStyle.Destructive,
                            },
                          });
                          if (!ok) {
                            return;
                          }
                          await deleteAllForDay(date);
                          revalidate();
                        }}
                      />
                    </ActionPanel>
                  }
                  title={time}
                  subtitle={entry.notes}
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

function getSectionTitle(date: Dayjs) {
  const isToday = date.isToday();
  const isYesterday = date.isYesterday();
  const isTomorrow = date.isTomorrow();

  if (isToday) {
    return "Today";
  }

  if (isYesterday) {
    return "Yesterday";
  }

  if (isTomorrow) {
    return "Tomorrow";
  }

  if (isThisWeek(date)) {
    return date.format("dddd");
  }
}
