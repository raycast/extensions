import { useState } from "react";
import { useLists } from "./hooks/useLists";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useReminders } from "./hooks/useReminders";
import { useUpdateReminder } from "./hooks/useUpdateReminder";

enum Priority {
  None = 0,
  High = 1,
  Medium = 5,
  Low = 9,
}

const ReminderIcon = ({ priority }: { priority: Priority }) => {
  switch (priority) {
    case Priority.High:
      return Icon.Exclamationmark3;
    case Priority.Medium:
      return Icon.Exclamationmark2;
    case Priority.Low:
      return Icon.Exclamationmark;
    default:
      return undefined;
  }
};

const Reminders = ({ listId }: { listId: string }) => {
  const { reminders, loadingReminders, mutateReminders } = useReminders({
    listId,
    fields: ["name", "id", "dueDate", "priority", "body"],
  });
  const { updateReminder } = useUpdateReminder();

  return (
    <List isLoading={loadingReminders} navigationTitle="Reminders" searchBarPlaceholder="Search your reminders">
      {reminders?.map((reminder) => {
        const accessories: List.Item.Accessory[] = [];
        if (reminder.dueDate) {
          accessories.push({
            date: new Date(reminder.dueDate),
            icon: Icon.Calendar,
          });
        }

        return (
          <List.Item
            key={reminder.id}
            title={reminder.name}
            subtitle={reminder.body}
            accessories={accessories}
            icon={ReminderIcon({ priority: reminder.priority })}
            actions={
              <ActionPanel>
                <Action
                  title="Mark as done"
                  onAction={async () =>
                    mutateReminders(updateReminder({ reminderId: reminder.id, fields: { completed: true } }), {
                      optimisticUpdate(data) {
                        return data?.filter((previousReminder) => previousReminder.id !== reminder.id);
                      },
                    })
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default () => {
  const [searchText, setSearchText] = useState<string>("");
  const { remindersLists, loadingRemidersLists } = useLists();

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering
      navigationTitle="Search Reminders"
      searchBarPlaceholder="Search your reminders lists"
      isLoading={loadingRemidersLists}
    >
      {remindersLists?.map((list) => (
        <List.Item
          key={list.id}
          title={list.name}
          actions={
            <ActionPanel>
              <Action.Push title="Show reminders" target={<Reminders listId={list.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
