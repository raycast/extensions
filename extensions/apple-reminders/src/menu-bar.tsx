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
  Keyboard,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { addWeeks, endOfWeek, format, startOfToday, startOfTomorrow, startOfWeek } from "date-fns";
import { useEffect, useMemo, useReducer } from "react";
import {
  deleteReminder as apiDeleteReminder,
  setPriorityStatus,
  toggleCompletionStatus,
  setDueDate as setReminderDueDate,
} from "swift:../swift/AppleReminders";

import {
  formatReminderTime,
  getAttachedUrls,
  getPriorityIcon,
  isOverdue,
  isToday,
  isTomorrow,
  truncate,
} from "./helpers";
import {
  DISMISSED_KEY,
  findNextReminder,
  formatRelativeDue,
  isListSelected,
  LEGACY_MENU_BAR_LIST_KEY,
  ListSelection,
  MENU_BAR_LISTS_KEY,
  parseMinutesPreference,
  pruneDismissed,
  resolveListSelection,
  shouldHideMenuBar,
  toggleListSelection,
} from "./helpers/next-reminder";
import { openAttachedUrls } from "./helpers/open-attached-urls";
import { Priority, Reminder, useData } from "./hooks/useData";
import { sortByDate } from "./hooks/useViewReminders";

const REMINDERS_FILE_ICON = "/System/Applications/Reminders.app";

export default function Command() {
  const {
    titleType,
    hideMenuBarCountWhenEmpty,
    displayListTitleForMenuBarReminders,
    view,
    countType,
    nextReminderShowBefore,
    nextReminderHideAfter,
    hideWhenNothingDue,
  } = getPreferenceValues<Preferences.MenuBar>();

  const { data, isLoading, mutate } = useData();
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  // Lists shown in the menu bar. Replaces the older single-list choice, which is migrated once.
  const [legacyListId, setLegacyListId] = useCachedState<string | undefined>(LEGACY_MENU_BAR_LIST_KEY);
  const [storedLists, setStoredLists] = useCachedState<ListSelection | undefined>(MENU_BAR_LISTS_KEY, undefined);
  const lists = resolveListSelection(storedLists, legacyListId);
  useEffect(() => {
    if (!legacyListId) return;
    setStoredLists(lists);
    setLegacyListId(undefined);
  }, [legacyListId]);
  const noListsSelected = lists !== "all" && lists.length === 0;
  const selectedLists = lists === "all" ? [] : (data?.lists.filter((l) => lists.includes(l.id)) ?? []);
  // Reminders dismissed from the menu bar title, like Calendar's "Dismiss event".
  const [dismissed, setDismissed] = useCachedState<Record<string, string>>(DISMISSED_KEY, {});

  const reminders = useMemo(() => {
    if (!data || !data.reminders || !Array.isArray(data.reminders)) return [];
    return data.reminders.filter((reminder: Reminder) => isListSelected(lists, reminder.list?.id));
  }, [data, lists]);

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

  // Raycast waits for one more render after a menu bar action ends. When the action removes its own item
  // (completing, deleting or moving a reminder), nothing renders again, so the action never ends and the
  // next one fails with "Worker unloaded". Render once more after the action so it can end.
  function renderAfterAction() {
    setTimeout(rerender, 0);
  }

  async function setPriority(reminderId: string, priority: Priority) {
    try {
      await setPriorityStatus({ reminderId, priority });
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: priority ? "Set priority" : "Removed priority",
        message: priority ? `Changed to ${priority}` : "",
      });
    } catch {
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
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: `Unable to set due date`,
      });
    } finally {
      renderAfterAction();
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
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to delete reminder",
        message: reminder.title,
      });
    } finally {
      renderAfterAction();
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

  async function toggleList(listId?: string) {
    setStoredLists(toggleListSelection(lists, listId));
    await mutate();
  }

  // Calendar-style next reminder: shown from N minutes before it's due until it's hidden.
  const nextReminderEnabled = Boolean(nextReminderShowBefore) && nextReminderShowBefore !== "never";
  const nextReminder = nextReminderEnabled
    ? findNextReminder(reminders, now, {
        showBeforeMinutes: parseMinutesPreference(nextReminderShowBefore, 15),
        hideAfterMinutes: parseMinutesPreference(nextReminderHideAfter, null),
        dismissed,
      })
    : undefined;

  let title = "";
  if (titleType === "count") {
    title = hideMenuBarCountWhenEmpty && remindersCount === 0 ? "" : String(remindersCount);
  }

  // The first reminder the dropdown lists. The count can include reminders the dropdown doesn't show, so it
  // isn't used to decide whether there is one.
  const firstReminder = !nextReminder && titleType === "firstReminder" ? sections[0]?.items[0] : undefined;
  if (nextReminder) {
    title = truncate(`${addPriorityToTitle(nextReminder.reminder.title, nextReminder.reminder.priority)}`, 24);
    title = `${title} · ${formatRelativeDue(nextReminder.due, now)}`;
  } else if (firstReminder) {
    const formattedTime = formatReminderTime(firstReminder);
    const timePrefix = formattedTime ? `${formattedTime}  ` : "";
    title = truncate(`${timePrefix}${addPriorityToTitle(firstReminder.title, firstReminder.priority)}`, 30);
  }

  // Decide from cached reminders while fresh ones load, so a hidden item doesn't flash on every refresh.
  if (
    shouldHideMenuBar({
      hideWhenNothingDue,
      nextReminderEnabled,
      isLoading: !data,
      hasNextReminder: !!nextReminder,
      lists,
    })
  ) {
    // An empty loading item keeps the command running until the refresh lands; returning null would unload it.
    return isLoading ? <MenuBarExtra isLoading /> : null;
  }

  const listsLabel =
    lists === "all"
      ? "All"
      : noListsSelected
        ? "None"
        : selectedLists.length === 1
          ? selectedLists[0].title
          : `${selectedLists.length}`;

  return (
    <MenuBarExtra isLoading={isLoading} icon={{ source: { light: "icon.png", dark: "icon@dark.png" } }} title={title}>
      {nextReminder ? (
        <MenuBarExtra.Section title={`${nextReminder.reminder.title} · ${formatRelativeDue(nextReminder.due, now)}`}>
          <MenuBarExtra.Item
            title="Complete"
            icon={Icon.CheckCircle}
            onAction={async () => {
              const reminder = nextReminder.reminder;
              try {
                await toggleCompletionStatus(reminder.id);
                await mutate();
                await showToast({ style: Toast.Style.Success, title: "Completed Reminder", message: reminder.title });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unable to mark reminder as complete",
                  message: reminder.title,
                });
              } finally {
                renderAfterAction();
              }
            }}
          />
          <MenuBarExtra.Item
            title="Open Reminder"
            icon={{ fileIcon: REMINDERS_FILE_ICON }}
            onAction={() => open(nextReminder.reminder.openUrl, "com.apple.reminders")}
          />
          <MenuBarExtra.Item
            title="Dismiss"
            icon={Icon.EyeDisabled}
            tooltip="Hide it from the menu bar without completing it. It shows again if it's rescheduled."
            onAction={() => {
              const { reminder } = nextReminder;
              const kept = data ? pruneDismissed(dismissed, data.reminders) : dismissed;
              setDismissed({ ...kept, [reminder.id]: reminder.dueDate as string });
              renderAfterAction();
            }}
          />
        </MenuBarExtra.Section>
      ) : null}
      {firstReminder ? (
        <MenuBarExtra.Item
          title="Complete"
          icon={Icon.CheckCircle}
          onAction={async () => {
            const reminder = firstReminder;
            try {
              await toggleCompletionStatus(reminder.id);
              await mutate();
              await showToast({
                style: Toast.Style.Success,
                title: "Marked reminder as complete",
                message: reminder.title,
              });
            } catch {
              await showToast({
                style: Toast.Style.Failure,
                title: "Unable to mark reminder as complete",
                message: reminder.title,
              });
            } finally {
              renderAfterAction();
            }
          }}
        />
      ) : null}
      {noListsSelected ? (
        <MenuBarExtra.Section title="No lists selected">
          <MenuBarExtra.Item title="Show All Lists" icon={Icon.Tray} onAction={() => toggleList(undefined)} />
        </MenuBarExtra.Section>
      ) : null}
      {sections.map((section) => (
        <MenuBarExtra.Section key={section.title} title={section.title}>
          {section.items.map((reminder) => {
            const attachedUrls = getAttachedUrls(reminder);

            const formattedTime = formatReminderTime(reminder);
            const timePrefix = formattedTime ? `${formattedTime}  ` : "";

            return (
              <MenuBarExtra.Submenu
                icon={reminder.isCompleted ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                key={reminder.id}
                title={truncate(
                  `${timePrefix}${addPriorityToTitle(
                    displayListTitleForMenuBarReminders
                      ? addListTitle(reminder.title, reminder.list?.title)
                      : reminder.title,
                    reminder.priority,
                  )}`,
                )}
              >
                <MenuBarExtra.Item
                  title="Open Reminder"
                  onAction={() => open(reminder.openUrl, "com.apple.reminders")}
                  icon={{ fileIcon: REMINDERS_FILE_ICON }}
                />
                {attachedUrls.length ? (
                  <MenuBarExtra.Item
                    title={`Open Attached URL${attachedUrls.length > 1 ? "s" : ""}`}
                    icon={Icon.Link}
                    onAction={() => openAttachedUrls(attachedUrls)}
                  />
                ) : null}

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
                    } catch {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: `Unable to mark reminder as ${reminder.isCompleted ? "incomplete" : "complete"}`,
                        message: reminder.title,
                      });
                    } finally {
                      renderAfterAction();
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
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "create-reminder", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Submenu
          title={`Lists (${listsLabel})`}
          icon={selectedLists.length === 1 ? { source: Icon.Circle, tintColor: selectedLists[0].color } : Icon.Tray}
        >
          <MenuBarExtra.Item
            title="All Lists"
            onAction={() => toggleList(undefined)}
            icon={lists === "all" ? Icon.Checkmark : Icon.Tray}
          />
          {data?.lists.map((list) => (
            <MenuBarExtra.Item
              key={list.id}
              title={list.title}
              onAction={() => toggleList(list.id)}
              icon={
                lists !== "all" && lists.includes(list.id)
                  ? { source: Icon.CheckCircle, tintColor: list.color }
                  : { source: Icon.Circle, tintColor: list.color }
              }
            />
          ))}
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
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
