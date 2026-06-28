import {
  Cache,
  Color,
  confirmAlert,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { calData, calDateTitle, calFirstColumn, calWeekTitle } from "./utils/calendar-utils";
import { CALENDAR_APP, REMINDERS_APP, SETTINGS_APP } from "./utils/constans";
import {
  calendarView,
  highlightCalendar,
  largeCalendar,
  remindersView,
  showCalendar,
  showEventsInMenubar,
  showReminders,
  showSettings,
  showWeekNumber,
  titleTruncateLength,
} from "./types/preferences";
import {
  extraItemIcon,
  getWeekNumberColor,
  getWeekNumIcon,
  menubarIcon,
  menubarTitle,
  openApp,
  truncate,
  truncateMenubarTitle,
  truncateSubtitle,
} from "./utils/common-utils";
import { Fragment, useMemo } from "react";
import { Reminder, useReminders } from "./hooks/useReminders";
import { addPriorityToTitle, buildReminderToolTip, isOverdue, isToday, isTomorrow } from "./utils/reminders-utils";
import { deleteReminder as apiDeleteReminder, toggleCompletionStatus } from "swift:../swift/AppleReminders";
import { CalendarEvent, useCalendar } from "./hooks/useCalendar";
import {
  buildCalendarToolTip,
  findFirstEventWithinNHours,
  formatEventTimeMultiItemSubtitle,
  formatEventTimeMultiSection,
  getCalendarIcon,
  getEventUrl,
  timeStampIsThreeDay,
  timeStampIsToday,
} from "./utils/calendar-events-utils";
import { format } from "date-fns";
import { CacheKey, CCalendarList } from "./types/calendar";

export default function Command() {
  const calList = calData();

  const { data: calendarData } = useCalendar();
  const { data: remindersData, isLoading, mutate } = useReminders();

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

  const reminders = useMemo(() => {
    if (!remindersData) return [];
    const cache = new Cache();
    const calendarListItemsStr = cache.get(CacheKey.CONFIGURE_LIST_ITEMS);
    if (calendarListItemsStr) {
      let ccListItem: CCalendarList[] = [];
      try {
        ccListItem = JSON.parse(calendarListItemsStr) as CCalendarList[];
      } catch (error) {
        console.error("JSON parsing error:", error);
      }
      const cCalendarList = ccListItem[1].list.filter((item) => item.enabled);
      return remindersData.reminders.filter((calendar) => {
        if (calendar.list != null) {
          return cCalendarList.findIndex((item) => item.id === calendar.list!.id) !== -1;
        }
        return true;
      });
    }
    return remindersData.reminders;
  }, [remindersData]);

  const reminderSections = useMemo(() => {
    const overdue: Reminder[] = [];
    const today: Reminder[] = [];
    const tomorrow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const other: Reminder[] = [];

    reminders?.forEach((reminder: Reminder) => {
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
      { title: "Past Due", items: overdue },
      { title: "Today", items: today },
    ];

    if (remindersView === "upcoming" || remindersView === "all") {
      sections.push({ title: "Tomorrow", items: tomorrow }, { title: "Upcoming", items: upcoming });
    }

    if (remindersView === "all") {
      sections.push({ title: "Other", items: other });
    }

    if (remindersView === "none") {
      return [];
    } else {
      return sections.filter((section) => section.items.length > 0);
    }
  }, [reminders]);

  const calendars = useMemo(() => {
    if (!calendarData) return [];
    const cache = new Cache();
    const calendarListItemsStr = cache.get(CacheKey.CONFIGURE_LIST_ITEMS);
    if (calendarListItemsStr) {
      let ccListItem: CCalendarList[] = [];
      try {
        ccListItem = JSON.parse(calendarListItemsStr) as CCalendarList[];
      } catch (error) {
        console.error("JSON parsing error:", error);
      }
      const cCalendarList = ccListItem[0].list.filter((item) => item.enabled);
      return calendarData.filter(
        (calendar) => cCalendarList.findIndex((item) => item.id === calendar.calendar.id) !== -1,
      );
    }
    return calendarData;
  }, [calendarData]);

  const calendarEventSections = useMemo(() => {
    if (calendarView === "none") return [];
    const allCalendarEvents: CalendarEvent[] = [];
    const now = new Date();
    calendars?.map((calendar) => {
      switch (calendarView) {
        case "today":
          calendar.events = calendar.events.filter((event) => timeStampIsToday(event.startDate, now));
          break;
        case "upcoming":
          calendar.events = calendar.events.filter((event) => timeStampIsThreeDay(event.startDate, now));
          break;
        case "all":
          break;
      }
      allCalendarEvents.push(...calendar.events);
    });

    return allCalendarEvents.sort((a, b) => a.startDate - b.startDate);
  }, [calendars]);

  const eventMenubarTitle = useMemo(() => {
    const event = findFirstEventWithinNHours(calendarEventSections, Number(showEventsInMenubar));
    if (event.event === null) {
      return "";
    } else {
      return (
        "  " + truncateMenubarTitle(event.event.title, parseInt(titleTruncateLength)) + "  • in " + event.timeUntilEvent
      );
    }
  }, [calendarEventSections]);

  const groupEventsByDay = (events: CalendarEvent[]): Record<string, CalendarEvent[]> => {
    return events.reduce(
      (groups, event) => {
        const startDate = new Date(event.startDate);
        const dayKey = format(startDate, "yyyy-MM-dd");

        if (!groups[dayKey]) {
          groups[dayKey] = [];
        }
        groups[dayKey].push(event);

        return groups;
      },
      {} as Record<string, CalendarEvent[]>,
    );
  };
  const groupedEvents = useMemo(() => {
    return groupEventsByDay(calendarEventSections);
  }, [calendarEventSections]);

  return (
    <MenuBarExtra isLoading={isLoading} title={menubarTitle() + eventMenubarTitle} icon={menubarIcon()}>
      <MenuBarExtra.Item title={calDateTitle} onAction={highlightCalendar ? () => {} : undefined} />
      <MenuBarExtra.Item title={calWeekTitle()} onAction={highlightCalendar ? () => {} : undefined} />
      {calList.map((calRow, index) => (
        <Fragment key={"fragment_" + index}>
          <MenuBarExtra.Item
            key={"cal_" + index}
            icon={
              showWeekNumber
                ? {
                    source: getWeekNumIcon(calFirstColumn()[index]),
                    tintColor: getWeekNumberColor,
                  }
                : undefined
            }
            title={calRow}
            onAction={highlightCalendar ? () => {} : undefined}
          />
          {largeCalendar && index !== calList.length - 1 && <MenuBarExtra.Item key={"space_end_" + index} title={""} />}
        </Fragment>
      ))}
      // calendar events
      {Object.keys(groupedEvents).map((dayKey) => {
        return (
          <MenuBarExtra.Section
            key={dayKey}
            title={truncate(formatEventTimeMultiSection(groupedEvents[dayKey][0].startDate))}
          >
            {groupedEvents[dayKey].map((event, index) => {
              const eventUrl = getEventUrl(event);
              return (
                <MenuBarExtra.Item
                  key={event.openUrl + index}
                  icon={getCalendarIcon(event.status, event.color)}
                  title={truncate(event.title.replace(/\\n/g, " "))}
                  subtitle={truncateSubtitle(
                    event.title.replace(/\\n/g, " "),
                    formatEventTimeMultiItemSubtitle(event.startDate, event.endDate, event.isAllDay),
                  )}
                  tooltip={buildCalendarToolTip(event)}
                  onAction={async () => {
                    await open(event.openUrl, "com.apple.iCal");
                  }}
                  alternate={
                    <MenuBarExtra.Item
                      key={event.openUrl + index}
                      icon={
                        eventUrl
                          ? { source: Icon.Link, tintColor: event.color }
                          : getCalendarIcon(event.status, event.color)
                      }
                      title={truncate(eventUrl ? eventUrl : truncate(event.title.replace(/\\n/g, " ")))}
                      subtitle={
                        eventUrl
                          ? undefined
                          : truncateSubtitle(
                              event.title.replace(/\\n/g, " "),
                              formatEventTimeMultiItemSubtitle(event.startDate, event.endDate, event.isAllDay),
                            )
                      }
                      tooltip={buildCalendarToolTip(event)}
                      onAction={
                        eventUrl
                          ? async () => {
                              await open(eventUrl);
                            }
                          : undefined
                      }
                    />
                  }
                />
              );
            })}
          </MenuBarExtra.Section>
        );
      })}
      // reminders
      {reminderSections.map((section) => (
        <MenuBarExtra.Section key={section.title} title={section.title}>
          {section.items.map((reminder) => {
            return (
              <MenuBarExtra.Item
                icon={
                  reminder.isCompleted
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.Circle, tintColor: reminder.list?.color }
                }
                key={reminder.id}
                title={truncate(addPriorityToTitle(reminder.title, reminder.priority))}
                tooltip={buildReminderToolTip(reminder)}
                onAction={async (itemActionEvent) => {
                  if (itemActionEvent.type === "right-click") {
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
                  } else {
                    await open(reminder.openUrl, "com.apple.reminders");
                  }
                }}
                alternate={
                  <MenuBarExtra.Item
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    title={truncate(addPriorityToTitle(reminder.title, reminder.priority))}
                    subtitle={reminder.url ? reminder.url : undefined}
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
                  />
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section>
        {showCalendar && (
          <MenuBarExtra.Item
            title={"Calendar"}
            icon={extraItemIcon(CALENDAR_APP, Icon.Calendar)}
            onAction={async () => {
              await openApp(CALENDAR_APP);
            }}
          />
        )}
        {showReminders && (
          <MenuBarExtra.Item
            title={"Reminders"}
            icon={extraItemIcon(REMINDERS_APP, Icon.BulletPoints)}
            onAction={async () => {
              await openApp(REMINDERS_APP);
            }}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {showSettings && (
          <MenuBarExtra.Item
            title={"Calendar List"}
            icon={extraItemIcon(CALENDAR_APP, Icon.List)}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "index2",
                  type: LaunchType.UserInitiated,
                });
              } catch (e) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Calendar List command is disabled",
                });
              }
            }}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {showSettings && (
          <MenuBarExtra.Item
            title={"Settings..."}
            icon={extraItemIcon(SETTINGS_APP, Icon.Gear)}
            onAction={async () => {
              await openCommandPreferences();
            }}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
