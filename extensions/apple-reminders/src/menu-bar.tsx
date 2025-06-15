import {
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  confirmAlert,
  open,
  getPreferenceValues,
  showToast,
  launchCommand,
  LaunchType,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { addWeeks, endOfWeek, format, startOfToday, startOfTomorrow, startOfWeek } from "date-fns";
import { useMemo } from "react";
import {
  deleteReminder as apiDeleteReminder,
  setPriorityStatus,
  toggleCompletionStatus,
  setDueDate as setReminderDueDate,
} from "swift:../swift/AppleReminders";

import { getPriorityIcon, isOverdue, isToday, isTomorrow, truncate } from "./helpers";
import { Priority, Reminder, useData } from "./hooks/useData";
import { sortByDate } from "./hooks/useViewReminders";

const REMINDERS_FILE_ICON = "/System/Applications/Reminders.app";

export default function Command() {
  const { titleType, hideMenuBarCountWhenEmpty, displayListTitleForMenuBarReminders, view, countType } =
    getPreferenceValues<Preferences.MenuBar>();

  const { data, isLoading, mutate } = useData();
  const [listId, setListId] = useCachedState<string>("menu-bar-list");
  const list = data?.lists.find((l) => l.id === listId);

  const reminders = useMemo(() => {
    if (!data) return [];
    return listId ? data.reminders.filter((reminder: Reminder) => reminder.list?.id === listId) : data.reminders;
  }, [data, listId]);

  const sections = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const tomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const other: Reminder[] = [];

    const { sortMenuBarRemindersByDueDate } = getPreferenceValues<Preferences.MenuBar>();
    const sortedReminders = sortMenuBarRemindersByDueDate ? reminders.sort(sortByDate) : reminders;

    sortedReminders?.forEach((reminder: Reminder) => {
      if (reminder.isCompleted) return;

      if (!reminder.dueDate) {
        other.push(reminder);
      } else {
        const { dueDate } = reminder;
        if (isOverdue(dueDate)) {
          overdue.push(reminder);
        } else if (isToday(dueDate)) {
          today.push(reminder);
        } else if (isTomorrow(dueDate)) {
          tomorrow.push(reminder);
        } else {
          upcoming.push(reminder);
        }
      }
    });

    const sections = [
      { title: "Overdue", items: overdue },
      { title: "Today", items: today },
    ];

    if (view === "upcoming" || view === "all") {
      sections.push({ title: "Tomorrow", items: tomorrow }, { title: "Upcoming", items: upcoming });
    }

    if (view === "all") {
      sections.push({ title: "Other", items: other });
    }

    return sections.filter((section) => section.items.length > 0);
  }, [reminders, view]);

  async function setPriority(reminderId: string, priority: Priority) {
    try {
      await setPriorityStatus({ reminderId, priority });
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: priority ? "Set priority" : "Removed priority",
        message: priority ? `Changed to ${priority}` : "",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to set priority`,
      });
    }
  }

  async function setDueDate(reminderId: string, date: Date | null) {
    try {
      await setReminderDueDate({ reminderId, dueDate: date ? format(date, "yyyy-MM-dd") : null });
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: date ? "Set due date" : "Removed due date",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to set due date`,
      });
    }
  }

  async function deleteReminder(reminder: Reminder) {
    try {
      await apiDeleteReminder(reminder.id);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Deleted Reminder",
        message: reminder.title,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to delete reminder",
        message: reminder.title,
      });
    }
  }

  const remindersCount = useMemo(() => {
    if (countType === "today") {
      return reminders.filter(
        (reminder) => reminder?.dueDate && (isToday(reminder?.dueDate) || isOverdue(reminder?.dueDate)),
      ).length;
    } else if (countType === "upcoming") {
      return reminders.filter((reminder) => reminder.dueDate).length;
    } else {
      return reminders.length;
    }
  }, [reminders, countType]);

  const now = new Date();

  function addPriorityToTitle(title: string, priority: Priority) {
    switch (priority) {
      case "high":
        return `!!! ${title}`;
      case "medium":
        return `!! ${title}`;
      case "low":
        return `! ${title}`;
      default:
        return title;
    }
  }

  function addListTitle(title: string, listName?: string) {
    return listName ? `${title} [${listName}]` : title;
  }

  async function handleListChange(listId?: string) {
    setListId(listId);
    await mutate();
  }

  let title = "";
  if (titleType === "count") {
    title = hideMenuBarCountWhenEmpty && remindersCount === 0 ? "" : String(remindersCount);
  }

  const displayReminderTitle = titleType === "firstReminder" && remindersCount > 0;
  if (displayReminderTitle) {
    const firstReminder = sections[0].items[0];
    title = truncate(addPriorityToTitle(firstReminder.title, firstReminder.priority), 30);
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }} title={title}>
      {displayReminderTitle ? (
        <MenuBarExtra.Item
          title="Complete"
          icon={Icon.CheckCircle}
          onAction={async () => {
            const reminder = sections[0].items[0];
            try {
              await toggleCompletionStatus(reminder.id);
              await mutate();
              await showToast({
                style: Toast.Style.Success,
                title: "Marked reminder as complete",
                message: reminder.title,
              });
            } catch (error) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Unable to mark reminder as complete",
                message: reminder.title,
              });
            }
          }}
        />
      ) : null}
      {sections.map((section) => (
        <MenuBarExtra.Section key={section.title} title={section.title}>
          {section.items.map((reminder) => {
            return (
              <MenuBarExtra.Submenu
                icon={reminder.isCompleted ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                key={reminder.id}
                title={truncate(
                  addPriorityToTitle(
                    displayListTitleForMenuBarReminders
                      ? addListTitle(reminder.title, reminder.list?.title)
                      : reminder.title,
                    reminder.priority,
                  ),
                )}
              >
                <MenuBarExtra.Item
                  title="Open Reminder"
                  onAction={() => open(reminder.openUrl, "com.apple.reminders")}
                  icon={{ fileIcon: REMINDERS_FILE_ICON }}
                />

                <MenuBarExtra.Item
                  title={reminder.isCompleted ? "Mark as Incomplete" : "Mark as Complete"}
                  icon={reminder.isCompleted ? Icon.Circle : Icon.Checkmark}
                  onAction={async () => {
                    try {
                      await toggleCompletionStatus(reminder.id);
                      await mutate();
                      await showToast({
                        style: Toast.Style.Success,
                        title: reminder.isCompleted ? "Marked reminder as incomplete" : "Completed Reminder",
                        message: reminder.title,
                      });
                    } catch (error) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: `Unable to mark reminder as ${reminder.isCompleted ? "incomplete" : "complete"}`,
                        message: reminder.title,
                      });
                    }
                  }}
                />

                <MenuBarExtra.Submenu title="Change Due Date" icon={Icon.Calendar}>
                  <MenuBarExtra.Item
                    title="Today"
                    icon={Icon.Clock}
                    onAction={() => setDueDate(reminder.id, startOfToday())}
                  />
                  <MenuBarExtra.Item
                    title="Tomorrow"
                    icon={Icon.Sunrise}
                    onAction={() => setDueDate(reminder.id, startOfTomorrow())}
                  />
                  <MenuBarExtra.Item
                    title="This Week-End"
                    icon={Icon.ArrowClockwise}
                    onAction={() => setDueDate(reminder.id, endOfWeek(now, { weekStartsOn: 1 }))}
                  />
                  <MenuBarExtra.Item
                    title="Next Week"
                    icon={Icon.Calendar}
                    onAction={() => setDueDate(reminder.id, startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }))}
                  />
                  <MenuBarExtra.Item
                    title="No Due Date"
                    icon={Icon.XMarkCircle}
                    onAction={() => setDueDate(reminder.id, null)}
                  />
                </MenuBarExtra.Submenu>

                <MenuBarExtra.Submenu title="Set Priority" icon={Icon.Exclamationmark}>
                  <MenuBarExtra.Item title="None" onAction={() => setPriority(reminder.id, null)} />
                  <MenuBarExtra.Item
                    title="High"
                    icon={getPriorityIcon("high")}
                    onAction={() => setPriority(reminder.id, "high")}
                  />
                  <MenuBarExtra.Item
                    title="Medium"
                    icon={getPriorityIcon("medium")}
                    onAction={() => setPriority(reminder.id, "medium")}
                  />
                  <MenuBarExtra.Item
                    title="Low"
                    icon={getPriorityIcon("low")}
                    onAction={() => setPriority(reminder.id, "low")}
                  />
                </MenuBarExtra.Submenu>

                <MenuBarExtra.Item
                  title="Delete Reminder…"
                  icon={Icon.Trash}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Reminder",
                        message: "Are you sure you want to delete this reminder?",
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                      })
                    ) {
                      await deleteReminder(reminder);
                    }
                  }}
                  alternate={
                    <MenuBarExtra.Item
                      title="Delete Reminder"
                      icon={Icon.Trash}
                      onAction={() => deleteReminder(reminder)}
                    />
                  }
                />
              </MenuBarExtra.Submenu>
            );
          })}
        </MenuBarExtra.Section>
      ))}

      {remindersCount === 0 ? <MenuBarExtra.Item title="You don't have any reminders." /> : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Reminder"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "create-reminder", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Submenu
          title={`Select List (${list?.title ?? "All"})`}
          icon={list ? { source: Icon.Circle, tintColor: list.color } : Icon.Tray}
        >
          <MenuBarExtra.Item title="All" onAction={() => handleListChange(undefined)} icon={Icon.Tray} />
          {data?.lists.map((list) => (
            <MenuBarExtra.Item
              key={list.id}
              title={list.title}
              onAction={() => handleListChange(list.id)}
              icon={{ source: Icon.Circle, tintColor: list.color }}
            />
          ))}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
          alternate={
            <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Reminders"
          icon={{ fileIcon: REMINDERS_FILE_ICON }}
          onAction={() => open("home", "com.apple.reminders")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
