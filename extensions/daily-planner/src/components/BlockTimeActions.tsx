import { Action, ActionPanel, Alert, Color, confirmAlert, getPreferenceValues, Icon, Image } from "@raycast/api";
import { areIntervalsOverlapping } from "date-fns";
import { Children, useMemo, useState } from "react";
import { createBlock, deleteEvent, rescheduleEvent, updateEventURL } from "../api/eventkit";
import { appendToTaskBlockURL, BREAK_BLOCK_DEEPLINK, createTaskBlockURL, taskBlockName } from "../api/todo-source";
import { callFunctionShowingToasts, updateStartDateOnListChange } from "../helpers/actions";
import { formatInterval } from "../helpers/datetime";
import { findTimeSlots } from "../helpers/interval";
import { shortcut } from "../helpers/shortcut";
import { BreakBlockItem, isTodoItem, TaskBlockItem, TodoItem } from "../helpers/todoList";
import { Block, CalendarEvent, DateInterval, TimeValueInterval, TodoSourceId } from "../types";

const { blockCalendar, alarmOffset, isReschedulingOnTimeblocking, breakBlockName } = getPreferenceValues<{
  blockCalendar: string;
  alarmOffset: string;
  isReschedulingOnTimeblocking: boolean;
  breakBlockName: string;
}>();

function ConditionalSubmenu(props: ActionPanel.Submenu.Props): JSX.Element {
  if (Children.count(props.children) === 1) {
    return Children.toArray(props.children)[0] as JSX.Element;
  }
  return <ActionPanel.Submenu {...props} />;
}

export default function BlockTimeActions({
  item,
  taskBlocks,
  isLoadingUpcomingEvents,
  upcomingEvents,
  availableTimes,
  defaultDuration,
  revalidateTodos,
  revalidateBlocks,
  revalidateUpcomingEvents,
}: {
  item: TodoItem | TaskBlockItem | BreakBlockItem;
  taskBlocks?: Block[] | null;
  isLoadingUpcomingEvents: boolean;
  upcomingEvents: CalendarEvent[] | undefined;
  availableTimes: TimeValueInterval[] | undefined;
  defaultDuration: number;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateBlocks: () => Promise<Block[]>;
  revalidateUpcomingEvents: () => Promise<CalendarEvent[]>;
}): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [currentInterval, setCurrentInterval] = useState<TimeValueInterval | undefined>(undefined);

  const { timeSlots, isRecognized } = useMemo(
    () => findTimeSlots(searchText, currentInterval, availableTimes, defaultDuration),
    [searchText, currentInterval, availableTimes, defaultDuration]
  );

  async function confirmOnSchedulingConflict(interval: DateInterval, eventId?: string): Promise<boolean> {
    if (upcomingEvents) {
      const otherEvents = eventId ? upcomingEvents.filter(({ id }) => id !== eventId) : upcomingEvents;
      const conflict = otherEvents.find((other) => areIntervalsOverlapping(interval, other));
      if (conflict) {
        return await confirmAlert({
          icon: Icon.ArrowsContract,
          title: "Scheduling Conflict Detected",
          message: `The selected time slot overlaps with "${conflict.title}" (${formatInterval(
            conflict
          )}). Schedule anyway?`,
          primaryAction: {
            title: "Proceed",
          },
        });
      }
    }
    return true;
  }

  async function addBlock(title: string, url: string, interval: DateInterval, formattedInterval: string) {
    if (await confirmOnSchedulingConflict(interval)) {
      await callFunctionShowingToasts({
        async fn() {
          await Promise.all([
            createBlock(title, url, interval, blockCalendar, alarmOffset).then(() =>
              Promise.all([revalidateBlocks(), revalidateUpcomingEvents()])
            ),

            isReschedulingOnTimeblocking && isTodoItem(item)
              ? updateStartDateOnListChange(item, interval.start, revalidateTodos)
              : Promise.resolve(),
          ]);
        },
        initTitle: "Blocking " + formattedInterval,
        successTitle: "Blocked " + formattedInterval,
        successMessage: `for ${title}`,
        failureTitle: "Failed to block " + formattedInterval,
      });
    } else {
      setSearchText("");
    }
  }

  async function addToTaskBlock(eventId: string, url: string, start: number, formattedInterval: string): Promise<void> {
    await callFunctionShowingToasts({
      async fn() {
        if (!isTodoItem(item)) {
          throw new Error(`Only to-do items can be added to ${taskBlockName}s`);
        }

        const newURL = appendToTaskBlockURL(url, item.id);

        await Promise.all([
          updateEventURL(eventId, newURL).then(() => revalidateBlocks()),

          isReschedulingOnTimeblocking && isTodoItem(item)
            ? updateStartDateOnListChange(item, start, revalidateTodos)
            : Promise.resolve(),
        ]);
      },
      initTitle: `Adding to ${taskBlockName} ${formattedInterval}`,
      successTitle: `Added to ${taskBlockName} ${formattedInterval}`,
      successMessage: `${item.title}`,
      failureTitle: `Failed to add to ${taskBlockName} ${formattedInterval}`,
    });
  }

  async function moveBlock(eventId: string, interval: DateInterval, formattedInterval: string) {
    if (await confirmOnSchedulingConflict(interval, eventId)) {
      await callFunctionShowingToasts({
        async fn() {
          await Promise.all([
            rescheduleEvent(eventId, interval).then(() =>
              Promise.all([revalidateBlocks(), revalidateUpcomingEvents()])
            ),

            isReschedulingOnTimeblocking && isTodoItem(item)
              ? updateStartDateOnListChange(item, interval.start, revalidateTodos)
              : Promise.resolve(),
          ]);
        },
        initTitle: `Moving ${formattedInterval}`,
        successTitle: `Moved ${formattedInterval}`,
        successMessage: `to ${formatInterval(interval)} for ${item.title}`,
        failureTitle: `Failed to move ${formattedInterval}`,
      });
    } else {
      setSearchText("");
    }
  }

  async function deleteBlock(eventId: string, formattedInterval: string) {
    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: "Delete Block",
      message: `Are you sure you want to delete the time block scheduled for ${formattedInterval}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await callFunctionShowingToasts({
        async fn() {
          await deleteEvent(eventId);
          await Promise.all([revalidateBlocks(), revalidateUpcomingEvents()]);
        },
        initTitle: "Deleting " + formattedInterval,
        successTitle: "Deleted " + formattedInterval,
        failureTitle: "Failed to delete " + formattedInterval,
      });
    }
  }

  const hasBlockedTime = item.blocked && item.blocked.items.length > 0;
  const hasBlockedTimeToday = hasBlockedTime;
  const blocks = item.blocked?.items;

  const SuggestedIntervals = ({
    icon,
    onAction,
  }: {
    icon?: Image.ImageLike;
    onAction: (interval: DateInterval, formattedInterval: string) => void;
  }): JSX.Element => {
    return (
      <>
        {timeSlots.map((interval) => {
          const formattedInterval = formatInterval(interval);
          return (
            <Action
              key={interval.start.getTime()}
              icon={icon}
              title={formattedInterval}
              onAction={() => onAction(interval, formattedInterval)}
            />
          );
        })}
      </>
    );
  };

  const moveAction = (
    <ConditionalSubmenu
      icon={{ source: { light: "light/calendar-arrow-right.svg", dark: "dark/calendar-arrow-right.svg" } }}
      title="Move Block"
      shortcut={shortcut.moveBlock}
    >
      {blocks?.map((event) => (
        // Unlike "Delete Block", `icon` is always displayed and `title` always starts with "Move" because the title
        // "Move Block..." isn't shown at the top of the time block list when this action is the primary action.
        // `onOpen` matches the duration of suggested options to that of the existing block.
        // Neither `formatDuration` (both "short" and "long") nor date-fns `millisecondsToHours` work.
        <ActionPanel.Submenu
          key={event.id}
          icon={{ source: { light: "light/calendar-arrow-right.svg", dark: "dark/calendar-arrow-right.svg" } }}
          title={"Move " + (blocks.length === 1 ? "Block" : formatInterval(event))}
          shortcut={blocks.length === 1 ? shortcut.moveBlock : undefined}
          isLoading={isLoadingUpcomingEvents}
          throttle
          filtering={!isRecognized}
          onSearchTextChange={setSearchText}
          onOpen={() => setCurrentInterval(event)}
        >
          <ActionPanel.Section title={"From " + formatInterval(event) + " to"}>
            <SuggestedIntervals
              onAction={(interval, formattedInterval) => void moveBlock(event.id, interval, formattedInterval)}
            />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      ))}
    </ConditionalSubmenu>
  );

  return (
    <>
      <ActionPanel.Section>
        {hasBlockedTimeToday ? moveAction : null}

        <ActionPanel.Submenu
          icon={{ source: { light: "light/calendar-plus.svg", dark: "dark/calendar-plus.svg" } }}
          title={"Block " + (hasBlockedTimeToday ? "More Time" : "Time")}
          autoFocus={true}
          shortcut={shortcut.blockTime}
          isLoading={isLoadingUpcomingEvents}
          filtering={!isRecognized}
          onSearchTextChange={setSearchText}
          onOpen={() => setCurrentInterval(undefined)}
        >
          <SuggestedIntervals
            onAction={(interval, formattedInterval) => void addBlock(item.title, item.url, interval, formattedInterval)}
          />
        </ActionPanel.Submenu>

        {!hasBlockedTime && isTodoItem(item) ? (
          <ActionPanel.Submenu
            icon={{ source: { light: "light/calendar-plus.svg", dark: "dark/calendar-plus.svg" } }}
            title={"Add to " + taskBlockName}
            shortcut={shortcut.addToTaskBlock}
            isLoading={isLoadingUpcomingEvents}
            throttle
            filtering={isRecognized ? false : { keepSectionOrder: true }}
            onSearchTextChange={setSearchText}
            onOpen={() => setCurrentInterval(undefined)}
          >
            {taskBlocks && !isRecognized ? (
              <ActionPanel.Section title="Existing">
                {taskBlocks.map(({ id, start, end, title, url }) => (
                  <Action
                    key={id}
                    icon={Icon.Calendar}
                    title={formatInterval({ start, end }) + (title === taskBlockName ? "" : ` (${title})`)}
                    onAction={() => void addToTaskBlock(id, url, start, formatInterval({ start, end }))}
                  />
                ))}
              </ActionPanel.Section>
            ) : null}

            <ActionPanel.Section title="New">
              <SuggestedIntervals
                icon={{ source: { light: "light/calendar-plus.svg", dark: "dark/calendar-plus.svg" } }}
                onAction={(interval, formattedInterval) =>
                  void addBlock(taskBlockName, createTaskBlockURL([item.id]), interval, formattedInterval)
                }
              />
            </ActionPanel.Section>
          </ActionPanel.Submenu>
        ) : null}

        <ActionPanel.Submenu
          icon={{ source: { light: "light/calendar-plus.svg", dark: "dark/calendar-plus.svg" } }}
          title="Add Break Block"
          autoFocus={true}
          shortcut={shortcut.addBreakBlock}
          isLoading={isLoadingUpcomingEvents}
          filtering={!isRecognized}
          onSearchTextChange={setSearchText}
          onOpen={() => setCurrentInterval(undefined)}
        >
          <SuggestedIntervals
            onAction={(interval, formattedInterval) =>
              // An empty string `breakBlockName` is allowed.
              void addBlock(breakBlockName, BREAK_BLOCK_DEEPLINK, interval, formattedInterval)
            }
          />
        </ActionPanel.Submenu>

        {hasBlockedTime && !hasBlockedTimeToday ? moveAction : null}

        {hasBlockedTime ? (
          <>
            <ConditionalSubmenu
              icon={{ source: { light: "light/calendar-xmark.svg", dark: "dark/calendar-xmark.svg" } }}
              title="Delete Block"
              shortcut={shortcut.deleteBlock}
            >
              {blocks?.map((event) => (
                <Action
                  key={event.id}
                  icon={
                    blocks.length === 1
                      ? {
                          source: { light: "light/calendar-xmark.svg", dark: "dark/calendar-xmark.svg" },
                          tintColor: Color.Red,
                        }
                      : null
                  }
                  title={blocks.length === 1 ? "Delete Block" : formatInterval(event)}
                  shortcut={blocks.length === 1 ? shortcut.deleteBlock : null}
                  style={blocks.length === 1 ? Action.Style.Destructive : Action.Style.Regular}
                  onAction={() => void deleteBlock(event.id, formatInterval(event))}
                />
              ))}
            </ConditionalSubmenu>
          </>
        ) : null}
      </ActionPanel.Section>

      {hasBlockedTime ? (
        <ActionPanel.Section>
          <Action.OpenInBrowser
            icon={{ source: { light: "light/calendar-event.svg", dark: "dark/calendar-event.svg" } }}
            title="Open in Calendar"
            shortcut={shortcut.openInCalendar}
            url={`ical://ekevent/${item.blocked.currentOrNextItem.id}?method=show&options=more`}
          />
        </ActionPanel.Section>
      ) : null}
    </>
  );
}
