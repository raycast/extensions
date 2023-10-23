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
} from "@raycast/api";
import {
  addWeeks,
  endOfWeek,
  isBefore,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
  startOfToday,
  startOfTomorrow,
  startOfWeek,
} from "date-fns";
import { useMemo } from "react";

import { deleteReminder, toggleCompletionStatus, setReminderPriority, setReminderDueDate } from "./api";
import { getPriorityIcon, truncateMiddle } from "./helpers";
import { Priority, Reminder, useData } from "./hooks/useData";

export default function Command() {
  const { displayMenuBarCount, view } = getPreferenceValues<Preferences.MenuBar>();

  const { data, isLoading, mutate } = useData();

  const sections = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const tomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const other: Reminder[] = [];

    data?.reminders.forEach((reminder) => {
      if (reminder.isCompleted) return;

      if (!reminder.dueDate) {
        other.push(reminder);
      } else {
        const dueDate = parseISO(reminder.dueDate);

        if (isBefore(dueDate, startOfDay(new Date()))) {
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

    return sections;
  }, [data, view]);

  async function setPriority(reminderId: string, priority: Priority) {
    try {
      await setReminderPriority(reminderId, priority);
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
      await setReminderDueDate(reminderId, date ? date.toISOString() : null);
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

  const remindersCount = sections.reduce((acc, section) => acc + section.items.length, 0);

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

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }}
      {...(displayMenuBarCount ? { title: String(remindersCount) } : {})}
    >
      {sections.map((section) =>
        section.items.length > 0 ? (
          <MenuBarExtra.Section key={section.title} title={section.title}>
            {section.items.map((reminder) => {
              return (
                <MenuBarExtra.Submenu
                  icon={reminder.isCompleted ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                  key={reminder.id}
                  title={truncateMiddle(addPriorityToTitle(reminder.title, reminder.priority))}
                >
                  <MenuBarExtra.Item
                    title="Open Reminder"
                    onAction={() => open(reminder.openUrl, "com.apple.reminders")}
                    icon={{ fileIcon: "/System/Applications/Reminders.app" }}
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
                    title="Delete Reminder"
                    icon={Icon.Trash}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Reminder",
                          message: "Are you sure you want to delete this reminder?",
                          icon: { source: Icon.Trash, tintColor: Color.Red },
                        })
                      ) {
                        try {
                          await deleteReminder(reminder.id);
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
                    }}
                  />
                </MenuBarExtra.Submenu>
              );
            })}
          </MenuBarExtra.Section>
        ) : null,
      )}

      {remindersCount === 0 ? <MenuBarExtra.Item title="You don't have any reminders." /> : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Reminder"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "create-reminder", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
