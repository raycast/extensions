import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { isWeekend } from "date-fns";
import {
  extractSourceIdedTodIdOrIds,
  getSourceIdedTodoId,
  isTaskBlock,
  priorityNameAndColor,
  SourceIdedTodoId,
} from "../api/todo-source";
import {
  Block,
  CalendarEvent,
  CalendarEventForReport,
  CalendarTimeEntry,
  TimeEntry,
  Todo,
  TodoGroup,
  TodoGroupType,
  TodoSourceId,
  TodoStatus,
} from "../types";
import { formatDuration, formatRelativeDateOnly } from "./datetime";
import { TodoItem } from "./todoList";
import { groupToMap, groupToMapFn } from "./group";

const { timeTrackingApp } = getPreferenceValues<{ timeTrackingApp: string }>();

export const reportGroupKey = {
  itemStatus: { title: "Item Status", key: "s" },
  todoGroup: { title: "Project/Area", key: "p" },
  tag: { title: "Tag", key: "t" },
  priority: { title: "Priority", key: "p" },
  completionDate: { title: "Completion Date", key: "c" },
  taskBlock: { title: "Task Block", key: "b" },
} as const;

export type ReportGroupKey = (typeof reportGroupKey)[keyof typeof reportGroupKey];

export const reportItemStatus = {
  completedAsScheduled: "Completed as Scheduled",
  completedSpontaneously: "Completed Spontaneously",
  completed: "Completed",
  progressingAsScheduled: "Progressing as Scheduled",
  progressingSpontaneously: "Progressing Spontaneously",
  progressing: "Progressing",
  upcoming: "Upcoming",
  missed: "Missed",
  // Below are currently unused
  scheduled: "Completed/Progressing as Scheduled",
  spontaneous: "Completed/Progressing Spontaneously",
  todos: "To-dos",
  canceled: "Canceled",
} as const;

export type ReportItemStatus = (typeof reportItemStatus)[keyof typeof reportItemStatus];

interface ReportItemStatusGroup {
  readonly type: (typeof reportGroupKey.itemStatus)["title"];
  readonly id: ReportItemStatus;
}

interface SourceIdedGroup<T extends string | number> {
  readonly type: T extends string
    ? (typeof reportGroupKey.todoGroup)["title"] | (typeof reportGroupKey.tag)["title"] | TodoGroupType
    : (typeof reportGroupKey.priority)["title"];
  readonly sourceId: TodoSourceId;
  readonly id: T;
}

interface SourceAgnosticGroup {
  readonly type: (typeof reportGroupKey.completionDate)["title"] | (typeof reportGroupKey.taskBlock)["title"] | "event";
  readonly id: string;
}

type Group = ReportItemStatusGroup | SourceIdedGroup<string> | SourceIdedGroup<number> | SourceAgnosticGroup;

interface ReportItem {
  readonly id: string;
  readonly title: string;
  // `blockedDuration === 0`: this to-do was time-blocked, but with zero-duration blocks.
  // `blockedDuration === null`: this to-do was not time-blocked.
  blockedDuration?: number;
  // `trackedDuration === 0`: this to-do was time-tracked, but with zero-duration time entries (unlikely).
  // `trackedDuration === null`: this to-do was not time-tracked.
  trackedDuration?: number;
  percentTracked?: number;
  eventDuration?: number;
  parentGroupOrGroups?: (Group | Group[])[];
  sortValue?: number;
}

export interface TodoReportItem extends ReportItem {
  readonly id: SourceIdedTodoId;
  readonly sourceId: TodoSourceId;
  readonly todoId: string;
  readonly url: TodoItem["url"];
  readonly status: ReportItemStatus;
  completionDate: Date | null;
}

const eventRSVPStatus = {
  0: "Pending",
  1: "Accepted",
  2: "Declined",
  3: "Tentative",
} as const;

export type RSVPStatus = (typeof eventRSVPStatus)[keyof typeof eventRSVPStatus];

export interface EventReportItem extends ReportItem {
  readonly eventId: string;
  readonly start: number;
  readonly end: number;
  readonly hasAttendees: boolean;
  readonly rsvpStatus: RSVPStatus | null;
  readonly icon: Image.Source;
}

const leafType = {
  todo: "to-do",
  event: "event",
  mixed: "item",
} as const;

type LeafReportItemType = (typeof leafType)[keyof typeof leafType];

export interface GroupReportItem extends ReportItem {
  readonly type?: ReportGroupKey["title"] | Capitalize<TodoGroupType>;
  readonly icon?: Image.Source;
  sourceId?: TodoSourceId;
  status?: ReportItemStatus;
  itemCount?: number; // count of the lowest level items, i.e., `TodoReportItem` or `EventReportItem`.
  childType?: LeafReportItemType;
  children?: (GroupReportItem | TodoReportItem | EventReportItem)[];
}

export const reportItemSortDescriptor = {
  todoTimestamp: { title: "To-Do Completion Time", ascending: true, key: "c" }, //, default from `useSQL`
  blockedDuration: { title: "Total Time Blocked", ascending: false, key: "b" },
  trackedDuration: { title: "Total Time Tracked", ascending: false, key: "t" },
  percentTracked: { title: "% Tracked / Blocked", ascending: false, key: "p" },
  firstBlockStartTime: { title: "Block Start Time", ascending: true, key: "s" },
  firstTimeEntryStartTime: { title: "Time Entry Start Time", ascending: true, key: "e" },
} as const;

export type ReportItemSortDescriptor = (typeof reportItemSortDescriptor)[keyof typeof reportItemSortDescriptor];

export interface ReportOptions {
  groupKeys: ReportGroupKey[];
  excludeWeekends: boolean;
  showUnscheduledOpenTodos: boolean;
  groupBySpontaneity: boolean;
  groupByTodoStatus: boolean;
  sortDescriptor: ReportItemSortDescriptor;
}

interface Weighted<T> {
  weight: number;
  item: T;
}

interface AllocatedTime {
  blocks?: Block[];
  allocatedTaskBlocks?: Weighted<Block>[];
  timeEntries?: CalendarTimeEntry[];
  allocatedTimeEntries?: Weighted<TimeEntry>[];
}

type SortValueReducer = (accumulatedValue: number | undefined, currentValue: number | undefined) => number | undefined;

const sortValueReducer: Record<string, SortValueReducer> = {
  sum: (acc, cur) => (acc !== undefined ? acc + (cur ?? 0) : cur),
  min: (acc, cur) => (acc !== undefined && cur !== undefined ? (cur < acc ? cur : acc) : acc ?? cur),
};

const sortValueReducerFor: Record<ReportItemSortDescriptor["title"], SortValueReducer | "percentTracked" | null> = {
  [reportItemSortDescriptor.todoTimestamp.title]: null,
  [reportItemSortDescriptor.blockedDuration.title]: sortValueReducer.sum,
  [reportItemSortDescriptor.trackedDuration.title]: sortValueReducer.sum,
  [reportItemSortDescriptor.percentTracked.title]: "percentTracked",
  [reportItemSortDescriptor.firstBlockStartTime.title]: sortValueReducer.min,
  [reportItemSortDescriptor.firstTimeEntryStartTime.title]: sortValueReducer.min,
};

const icon: Record<TodoGroupType | "other" | "incomplete", Image.Source> = {
  area: Icon.Box,
  project: Icon.PieChart,
  list: Icon.List,
  other: { light: "light/square-ellipsis.svg", dark: "dark/square-ellipsis.svg" },
  incomplete: { light: "light/square.svg", dark: "dark/square.svg" },
};

interface CalendarEventWithTimeEntries extends CalendarEventForReport {
  allocatedTimeEntries?: Weighted<CalendarTimeEntry>[];
}

const eventGroupKeys = ["openTaskBlocks", "breakBlocks", "organizedEvents", "personalEvents"] as const;

type EventGroupKey = (typeof eventGroupKeys)[number];

const eventIcon: Record<EventGroupKey, Image.Source> = {
  openTaskBlocks: { light: "light/square-on-square.svg", dark: "dark/square-on-square.svg" },
  breakBlocks: { light: "light/cup.svg", dark: "dark/cup.svg" },
  organizedEvents: Icon.TwoPeople,
  personalEvents: { light: "light/calendar-event.svg", dark: "dark/calendar-event.svg" },
};

const eventGroup: Record<"other" | EventGroupKey, GroupReportItem> = {
  other: Object.freeze({ id: "other", title: "Other", icon: icon.other }),
  openTaskBlocks: Object.freeze({ id: "open-task-blocks", title: "Open Task Blocks", icon: eventIcon.openTaskBlocks }),
  breakBlocks: Object.freeze({ id: "break-blocks", title: "Break Blocks", icon: eventIcon.breakBlocks }),
  organizedEvents: Object.freeze({ id: "meeting", title: "Meetings", icon: eventIcon.organizedEvents }),
  personalEvents: Object.freeze({ id: "personal-events", title: "Personal Events", icon: eventIcon.personalEvents }),
};

function isEventGroupKey(key: string): key is EventGroupKey {
  return eventGroupKeys.includes(key as EventGroupKey);
}

export function isTodoReportItem(item: TodoReportItem | EventReportItem | GroupReportItem): item is TodoReportItem {
  return (item as TodoReportItem).todoId !== undefined;
}

export function isEventReportItem(item: ReportItem): item is EventReportItem {
  return (item as EventReportItem).start !== undefined;
}

export function isGroupReportItem(item: TodoReportItem | EventReportItem | GroupReportItem): item is GroupReportItem {
  return (item as GroupReportItem).children !== undefined;
}

export function formatItemCount(itemCount: number, itemType: string): string {
  return `${itemCount} ${itemType}${itemCount === 1 ? "" : "s"}`;
}

export function formatStats(item: TodoReportItem | EventReportItem | GroupReportItem): string {
  const elements: string[] = [];
  const { blockedDuration, trackedDuration, percentTracked, eventDuration } = item;

  if (isGroupReportItem(item) && item.itemCount !== undefined && item.childType) {
    elements.push(formatItemCount(item.itemCount, item.childType));
  }
  if (blockedDuration) {
    elements.push(`${formatDuration(blockedDuration)} blocked`);
  }
  if (trackedDuration) {
    elements.push(`${formatDuration(trackedDuration)} tracked`);
  }
  if (percentTracked) {
    elements.push(`${percentTracked}%`);
  }
  if (eventDuration) {
    elements.push(`${formatDuration(eventDuration)}`);
  }

  return elements.join(" ∙ ");
}

function getReportItemStatus(
  todoStatus: Todo["status"] | null,
  groupByTodoStatus: boolean,
  hasBlocks: boolean,
  groupBySpontaneity: boolean,
  hasTimeEntries: boolean,
  isPastScheduledBlocks: boolean
): ReportItemStatus {
  switch (todoStatus) {
    case TodoStatus.completed:
      if (groupBySpontaneity) {
        if (hasBlocks) {
          return groupByTodoStatus ? reportItemStatus.completedAsScheduled : reportItemStatus.scheduled;
        }
        return groupByTodoStatus ? reportItemStatus.completedSpontaneously : reportItemStatus.spontaneous;
      }
      return groupByTodoStatus ? reportItemStatus.completed : reportItemStatus.todos;

    case TodoStatus.open:
      if (groupBySpontaneity) {
        if (hasBlocks) {
          if (hasTimeEntries) {
            return groupByTodoStatus ? reportItemStatus.progressingAsScheduled : reportItemStatus.scheduled;
          }
          return groupByTodoStatus
            ? isPastScheduledBlocks
              ? reportItemStatus.missed
              : reportItemStatus.upcoming
            : reportItemStatus.scheduled;
        }
        if (hasTimeEntries) {
          return groupByTodoStatus ? reportItemStatus.progressingSpontaneously : reportItemStatus.spontaneous;
        }
        return groupByTodoStatus ? reportItemStatus.missed : reportItemStatus.todos;
      }

      if (hasBlocks) {
        return groupByTodoStatus
          ? isPastScheduledBlocks
            ? reportItemStatus.progressing
            : reportItemStatus.upcoming
          : reportItemStatus.todos;
      }
      return groupByTodoStatus ? reportItemStatus.missed : reportItemStatus.todos;
  }
  return reportItemStatus.canceled;
}

const now = Date.now();

// Unlike the one in buildTodoList, this INCLUDES running time entry duration.
export const sumDuration = (total: number, { start, end }: CalendarEvent | TimeEntry) =>
  total + (end !== null ? end : now) - start;

const sumWeightedDuration = (total: number, { weight, item: { start, end } }: Weighted<CalendarEvent | TimeEntry>) =>
  total + weight * ((end !== null ? end : now) - start);

function isBlock(event: CalendarEvent): event is Block {
  // In addition to `null`, also filter out `undefined` and empty strings (both unlikely).
  return !!event.url;
}

function isCalendarTimeEntry(timeEntry: TimeEntry): timeEntry is CalendarTimeEntry {
  // In addition to `null`, also filter out `undefined` and empty strings (both unlikely).
  return !!timeEntry.url;
}

// Maps the given `events` and `timeEntries` to the `sourceId`-`todoId` combination found in the `url` of each item, or,
// if missing (Toggl/Clockify), `title`. Also allocates blocked and tracked "Task Block" durations across all to-dos
// associated with each "Task Block".
//
// The sum that appears on the report may not add up to the grand total if the to-do's start date was adjusted after
// the to-do was timeblocked, and the adjusted start date is outside the reporting period. Filtering à la
// `todoList.transferAndGroupTaskBlockTodos()` can be used to address the issue, but then this allocation has to occur
// AFTER `TodoReportItem`s are created, in which case grouping becomes more complex. Besides, the filtering isn't
// necessary here because reports are strictly based on reporting periods vs. "List" in `todoList`'s case.
function allocateBlocksAndTimeEntries(
  events: CalendarEventForReport[],
  timeEntries: TimeEntry[] | null,
  excludeWeekends: boolean
): {
  allocatedTimes: Map<SourceIdedTodoId, AllocatedTime>;
  otherEvents: Record<EventGroupKey, CalendarEventWithTimeEntries[]>;
  titleGroupedTimeEntries?: Map<string, TimeEntry[]>;
} {
  // Categorize calendar events:
  // - `allocatedTimes` & `blocksAndIds`: blocks and Task Blocks whose URLs contain `SourceIdedTodoId`s
  // - `otherEvents`
  //   - `openTaskBlocks`: Task Blocks whose URLs contain no `SourceIdedTodoIds`
  //   - `breakBlocks`: Break Blocks
  //   - `organizedEvents`: calendar events that aren't Blocks and have attendees
  //   - `personalEvents`: calendar events that aren't Blocks and do not have attendees
  //
  // `blocksAndIds` is used for title-based matching of blocks and Toggl/Clockify time entries.
  const allocatedTimes = new Map<SourceIdedTodoId, AllocatedTime>();
  const blocksAndIds: { block: Block; sourceIdedTodoIds: SourceIdedTodoId[] }[] = [];
  const otherEvents: Record<EventGroupKey, CalendarEventWithTimeEntries[]> = {
    openTaskBlocks: [],
    breakBlocks: [],
    organizedEvents: [],
    personalEvents: [],
  };

  for (const event of events) {
    if (excludeWeekends && isWeekend(event.start)) {
      continue;
    }

    if (!isBlock(event)) {
      // no URL
      if (event.hasAttendees) {
        otherEvents.organizedEvents.push(event);
      } else {
        otherEvents.personalEvents.push(event);
      }
      continue;
    }

    const sourceIdedTodoIdOrIds = extractSourceIdedTodIdOrIds(event.url);
    if (!sourceIdedTodoIdOrIds) {
      // unrecognized URL
      if (event.hasAttendees) {
        otherEvents.organizedEvents.push(event);
      } else {
        otherEvents.personalEvents.push(event);
      }
      continue;
    }

    if (!Array.isArray(sourceIdedTodoIdOrIds)) {
      // Time Block
      const sourceIdedTodoId = sourceIdedTodoIdOrIds;

      const existing = allocatedTimes.get(sourceIdedTodoId);
      if (!existing) {
        allocatedTimes.set(sourceIdedTodoId, { blocks: [event] });
      } else {
        if (existing.blocks) existing.blocks.push(event);
        else existing.blocks = [event];
      }

      blocksAndIds.push({ block: event, sourceIdedTodoIds: [sourceIdedTodoId] });
    } else {
      // Task or Break Block
      if (sourceIdedTodoIdOrIds.length === 0) {
        if (isTaskBlock(event)) {
          otherEvents.openTaskBlocks.push(event);
        } else {
          otherEvents.breakBlocks.push(event);
        }
        continue;
      }

      const weightedTaskBlock: Weighted<Block> = {
        weight: 1 / sourceIdedTodoIdOrIds.length,
        item: event,
      };

      for (const sourceIdedTodoId of sourceIdedTodoIdOrIds) {
        const existing = allocatedTimes.get(sourceIdedTodoId);
        if (!existing) {
          allocatedTimes.set(sourceIdedTodoId, { allocatedTaskBlocks: [weightedTaskBlock] });
        } else {
          if (existing.allocatedTaskBlocks) existing.allocatedTaskBlocks.push(weightedTaskBlock);
          else existing.allocatedTaskBlocks = [weightedTaskBlock];
        }
      }

      blocksAndIds.push({ block: event, sourceIdedTodoIds: sourceIdedTodoIdOrIds });
    }
  }

  if (!timeEntries) {
    return { allocatedTimes, otherEvents };
  }

  const addWeightedTimeEntry = (
    sourceIdedTodoId: SourceIdedTodoId,
    weightedTimeEntry: Weighted<TimeEntry | CalendarTimeEntry>
  ): void => {
    const existing = allocatedTimes.get(sourceIdedTodoId);
    if (!existing) {
      allocatedTimes.set(sourceIdedTodoId, { allocatedTimeEntries: [weightedTimeEntry] });
    } else {
      if (!existing.allocatedTimeEntries) {
        existing.allocatedTimeEntries = [weightedTimeEntry];
      } else {
        existing.allocatedTimeEntries.push(weightedTimeEntry);
      }
    }
  };

  // Allocate time entries. The allocation method depends on the availability of the URL in time entries.
  // - Calendar time tracker: URL is available, and matching is done based on the sourceIdedTodoIds embedded in the URL.
  // - Toggl & Clockify: URL is unavailable, and matching is done based on the title.
  if (timeTrackingApp === "calendar") {
    // Currently ignored
    const nonTodoTimeEntries: TimeEntry[] = [];

    for (const entry of timeEntries) {
      if (excludeWeekends && isWeekend(entry.start)) {
        continue;
      }

      if (!isCalendarTimeEntry(entry)) {
        nonTodoTimeEntries.push(entry); // no URL
        continue;
      }

      const sourceIdedTodoIdOrIds = extractSourceIdedTodIdOrIds(entry.url);
      if (!sourceIdedTodoIdOrIds) {
        nonTodoTimeEntries.push(entry); // non-todo URL
        continue;
      }

      if (!Array.isArray(sourceIdedTodoIdOrIds)) {
        // Time entry for a Time Block
        const sourceIdedTodoId = sourceIdedTodoIdOrIds;

        const existing = allocatedTimes.get(sourceIdedTodoId);
        if (!existing) {
          allocatedTimes.set(sourceIdedTodoId, { timeEntries: [entry] });
        } else {
          if (existing.timeEntries) existing.timeEntries.push(entry);
          else existing.timeEntries = [entry];
        }
      } else {
        // Time entry for a Task or Break Block
        if (sourceIdedTodoIdOrIds.length === 0) {
          const blocks = (isTaskBlock(entry) ? otherEvents.openTaskBlocks : otherEvents.breakBlocks).filter(
            ({ url }) => url === entry.url
          );
          const totalBlockedDurationForURL = blocks.reduce(sumDuration, 0);

          for (const block of blocks) {
            const weightedTimeEntry: Weighted<CalendarTimeEntry> = {
              weight: (block.end - block.start) / totalBlockedDurationForURL,
              item: entry,
            };

            if (!block.allocatedTimeEntries) {
              block.allocatedTimeEntries = [weightedTimeEntry];
            } else {
              block.allocatedTimeEntries.push(weightedTimeEntry);
            }
          }

          continue;
        }

        const weightedTimeEntry: Weighted<CalendarTimeEntry> = {
          weight: 1 / sourceIdedTodoIdOrIds.length,
          item: entry,
        };

        for (const sourceIdedTodoId of sourceIdedTodoIdOrIds) {
          addWeightedTimeEntry(sourceIdedTodoId, weightedTimeEntry);
        }
      }
    }

    return { allocatedTimes, otherEvents };
  } else {
    // Match blocks and Toggl/Clockify time entries by title
    const groupedBlocksAndIds = groupToMapFn(blocksAndIds, ({ block }) => block.title);
    const titleGroupedTimeEntries = new Map<string, TimeEntry[]>();

    for (const entry of timeEntries) {
      if (excludeWeekends && isWeekend(entry.start)) {
        continue;
      }

      const blocksAndIds = groupedBlocksAndIds.get(entry.title);
      if (blocksAndIds) {
        const totalBlockedDurationForTitle = blocksAndIds.map(({ block }) => block).reduce(sumDuration, 0);
        for (const { block, sourceIdedTodoIds } of blocksAndIds) {
          const todoWeight = 1 / sourceIdedTodoIds.length;
          const durationWeight = (block.end - block.start) / totalBlockedDurationForTitle;
          const weightedTimeEntry: Weighted<TimeEntry> = {
            weight: todoWeight * durationWeight,
            item: entry,
          };

          for (const sourceIdedTodoId of sourceIdedTodoIds) {
            addWeightedTimeEntry(sourceIdedTodoId, weightedTimeEntry);
          }
        }
      } else {
        // a spontaneous (i.e., not timeblocked) to-do time entry OR a non-to-do time entry
        const existing = titleGroupedTimeEntries.get(entry.title);
        if (!existing) {
          titleGroupedTimeEntries.set(entry.title, [entry]);
        } else {
          existing.push(entry);
        }
      }
    }

    return { allocatedTimes, otherEvents, titleGroupedTimeEntries };
  }
}

function toTodoReportItem(
  { sourceId, todoId, url, title, status, priority, completionDate, group, tagIds }: Todo,
  allocatedTimes: Map<SourceIdedTodoId, AllocatedTime>,
  titleMatchedTimeEntries: TimeEntry[] | undefined,
  isTimeTracked: boolean,
  { groupKeys, groupByTodoStatus, groupBySpontaneity, sortDescriptor }: ReportOptions
): TodoReportItem {
  const id = getSourceIdedTodoId(sourceId, todoId);

  const allocatedTime = allocatedTimes.get(id);
  const blocks = allocatedTime?.blocks;
  const allocatedTaskBlocks = allocatedTime?.allocatedTaskBlocks;
  const timeEntries = allocatedTime?.timeEntries;
  const allocatedTimeEntries = allocatedTime?.allocatedTimeEntries;

  const hasBlocks = (blocks?.length ?? 0) + (allocatedTaskBlocks?.length ?? 0) > 0;
  const hasTimeEntries = (timeEntries?.length ?? 0) + (allocatedTimeEntries?.length ?? 0) > 0;
  const isPastScheduledBlocks =
    (!blocks || blocks.every(({ end }) => end < now)) &&
    (!allocatedTaskBlocks || allocatedTaskBlocks.every(({ item: { end } }) => end < now));

  const itemStatus = getReportItemStatus(
    status,
    groupByTodoStatus,
    hasBlocks,
    groupBySpontaneity && isTimeTracked,
    hasTimeEntries,
    isPastScheduledBlocks
  );

  const timeblocked = blocks?.reduce(sumDuration, 0);
  const allocatedTaskBlocked = allocatedTaskBlocks?.reduce(sumWeightedDuration, 0);
  const blockedDuration = hasBlocks ? (timeblocked ?? 0) + (allocatedTaskBlocked ?? 0) : undefined;

  const timeTracked = timeEntries?.reduce(sumDuration, 0);
  const allocatedTimeTracked = allocatedTimeEntries?.reduce(sumWeightedDuration, 0);
  const titleMatchedTimeTracked = titleMatchedTimeEntries?.reduce(sumDuration, 0);
  const trackedDuration = hasTimeEntries
    ? (timeTracked ?? 0) + (allocatedTimeTracked ?? 0) + (titleMatchedTimeTracked ?? 0)
    : undefined;

  const percentTracked =
    trackedDuration !== undefined && blockedDuration
      ? Math.round((trackedDuration / blockedDuration) * 100)
      : undefined;

  const firstBlock = blocks?.at(0);
  const firstTaskBlock = allocatedTaskBlocks?.at(0)?.item;
  const firstBlockStart =
    firstBlock && firstTaskBlock
      ? Math.min(firstBlock.start, firstTaskBlock.start)
      : firstBlock?.start ?? firstTaskBlock?.start;

  const firstMatchedTimeEntry = timeEntries?.at(0);
  const firstAllocatedTimeEntry = allocatedTimeEntries?.at(0)?.item;
  const firstTitleMatchedTimeEntry = titleMatchedTimeEntries?.at(0);
  const firstTimeEntryStart =
    firstMatchedTimeEntry || firstAllocatedTimeEntry || firstTitleMatchedTimeEntry
      ? Math.min(
          firstMatchedTimeEntry?.start ?? 0,
          firstAllocatedTimeEntry?.start ?? 0,
          firstTitleMatchedTimeEntry?.start ?? 0
        )
      : undefined;

  const sortValue =
    sortDescriptor === reportItemSortDescriptor.blockedDuration
      ? blockedDuration
      : sortDescriptor === reportItemSortDescriptor.trackedDuration
      ? trackedDuration
      : sortDescriptor === reportItemSortDescriptor.percentTracked
      ? percentTracked
      : sortDescriptor.title === reportItemSortDescriptor.firstBlockStartTime.title
      ? firstBlockStart
      : sortDescriptor.title === reportItemSortDescriptor.firstTimeEntryStartTime.title
      ? firstTimeEntryStart
      : undefined;

  const getGroupOrGroups = (groupKey: ReportGroupKey): Group | Group[] | undefined => {
    switch (groupKey) {
      case reportGroupKey.itemStatus:
        return { type: groupKey.title, id: itemStatus };

      case reportGroupKey.todoGroup:
        return group
          ? { type: group.type, sourceId, id: group.id }
          : { type: groupKey.title, sourceId, id: "No Project or Area" };

      case reportGroupKey.tag:
        return (
          tagIds?.map<SourceIdedGroup<string>>((id) => ({ type: groupKey.title, sourceId, id })) ?? {
            type: groupKey.title,
            sourceId,
            id: "No Tag",
          }
        );

      case reportGroupKey.priority:
        if (priority) {
          const priorityData = priorityNameAndColor[sourceId]?.[priority];
          if (priorityData) {
            return { type: groupKey.title, sourceId, id: priority };
          }
        }
        return { type: groupKey.title, sourceId, id: -1 };

      case reportGroupKey.completionDate:
        return {
          type: groupKey.title,
          id: completionDate ? "Completed " + formatRelativeDateOnly(completionDate) : "Incomplete",
        };

      case reportGroupKey.taskBlock:
        if (allocatedTaskBlocks && allocatedTaskBlocks.length > 0) {
          return Array.from(
            new Set(
              allocatedTaskBlocks.map<Group>(({ item: { title } }) => ({
                type: groupKey.title,
                id: title,
              }))
            )
          );
        }
    }
  };
  const parentGroupOrGroups: (Group | Group[])[] = [];
  for (const groupKey of groupKeys) {
    const groupOrGroupIds = getGroupOrGroups(groupKey);
    if (groupOrGroupIds) {
      parentGroupOrGroups.push(groupOrGroupIds);
    }
  }

  return {
    id,
    sourceId: sourceId,
    todoId,
    url,
    title,
    status: itemStatus,
    completionDate,
    blockedDuration,
    trackedDuration,
    percentTracked,
    parentGroupOrGroups,
    sortValue,
  };
}

function toEventReportItem(
  groupKey: EventGroupKey,
  { id, title, start, end, hasAttendees, rsvpStatus, allocatedTimeEntries }: CalendarEventWithTimeEntries
): EventReportItem {
  const isBlock = groupKey === "openTaskBlocks" || groupKey === "breakBlocks";

  return {
    id: id + start.toString(), // Create a unique ID for recurring events
    eventId: id,
    title,
    start,
    end,
    hasAttendees: hasAttendees > 0,
    rsvpStatus: rsvpStatus !== null ? eventRSVPStatus[rsvpStatus] : null,
    icon: eventIcon[groupKey],
    blockedDuration: isBlock ? end - start : undefined,
    trackedDuration: allocatedTimeEntries?.reduce(sumWeightedDuration, 0),
    eventDuration: isBlock ? undefined : end - start,
    parentGroupOrGroups: [
      { type: "event", id: "other" },
      { type: "event", id: groupKey },
    ],
  };
}

export function isCompleted(status: ReportItemStatus): boolean {
  return (
    status === reportItemStatus.completedAsScheduled ||
    status === reportItemStatus.completedSpontaneously ||
    status === reportItemStatus.completed
  );
}

export function isProgressing(status: ReportItemStatus): boolean {
  return (
    status === reportItemStatus.progressingAsScheduled ||
    status === reportItemStatus.progressingSpontaneously ||
    status === reportItemStatus.progressing
  );
}

function addItem(
  parent: GroupReportItem,
  child: GroupReportItem | TodoReportItem | EventReportItem,
  sortValueReducer?: SortValueReducer | null
): void {
  if ("sourceId" in child) {
    if (!parent.children?.length) {
      // Adopt `status` from the first `child`.
      parent.sourceId = child.sourceId;
    } else if (parent.sourceId !== child.sourceId) {
      parent.sourceId = undefined;
    }
  }

  if ("status" in child) {
    if (!parent.children?.length) {
      parent.status = child.status;
    } else if (parent.status !== child.status) {
      if (parent.status && child.status) {
        if (isCompleted(parent.status) && isCompleted(child.status)) {
          parent.status = reportItemStatus.completed;
        } else if (isProgressing(parent.status) && isProgressing(child.status)) {
          parent.status = reportItemStatus.progressing;
        } else {
          parent.status = undefined;
        }
      } else {
        parent.status = undefined;
      }
    }
  }

  parent.itemCount = (parent.itemCount ?? 0) + (isGroupReportItem(child) ? child.itemCount ?? 0 : 1);

  if (parent.blockedDuration !== undefined) {
    parent.blockedDuration += child.blockedDuration ?? 0;
  } else if (child.blockedDuration !== undefined) {
    parent.blockedDuration = child.blockedDuration;
  }

  if (parent.trackedDuration !== undefined) {
    parent.trackedDuration += child.trackedDuration ?? 0;
  } else if (child.trackedDuration !== undefined) {
    parent.trackedDuration = child.trackedDuration;
  }

  if (parent.eventDuration !== undefined) {
    parent.eventDuration += child.eventDuration ?? 0;
  } else if (child.eventDuration !== undefined) {
    parent.eventDuration = child.eventDuration;
  }

  const type = isGroupReportItem(child) ? child.childType : isTodoReportItem(child) ? leafType.todo : leafType.event;
  if (!parent.children?.length) {
    parent.childType = type;
  } else if (parent.childType !== type) {
    parent.childType = leafType.mixed;
  }

  if (parent.children) {
    parent.children.push(child);
  } else {
    parent.children = [child];
  }

  if (sortValueReducer) {
    parent.sortValue = sortValueReducer(parent.sortValue, child.sortValue);
  }
}

function updatePercentTracked(item: ReportItem, alsoUpdateSortValue?: boolean): void {
  if (item.trackedDuration !== undefined && item.blockedDuration) {
    item.percentTracked = Math.round((item.trackedDuration / item.blockedDuration) * 100);
    if (alsoUpdateSortValue) {
      item.sortValue = item.percentTracked;
    }
  }
}

function hasSourceId(group: Group): group is SourceIdedGroup<string> | SourceIdedGroup<number> {
  return (group as SourceIdedGroup<string> | SourceIdedGroup<number>).sourceId !== undefined;
}

function groupChildren(
  item: GroupReportItem,
  todoGroupTitles: Map<TodoSourceId, Map<TodoGroup["type"], Map<TodoGroup["id"], TodoGroup["title"]>>> | undefined,
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined,
  sortValueReducer?: SortValueReducer | "percentTracked" | null
): void {
  if (!item.children?.length) {
    return;
  }

  const toGroupReportItem = (group: Group): GroupReportItem => {
    if (hasSourceId(group)) {
      const { type, sourceId, id } = group;
      switch (type) {
        case "area":
        case "project":
        case "list": {
          // Group projects from different to-do apps together. To separate, use `${sourceId}${type}${id}` for `id`.
          const groupName = todoGroupTitles?.get(sourceId)?.get(type)?.get(id) ?? id;
          return {
            type: (type.charAt(0).toUpperCase() + type.slice(1)) as Capitalize<TodoGroupType>,
            id: groupName,
            title: groupName,
            icon: icon[type],
          };
        }

        case reportGroupKey.todoGroup.title:
          // Relevant for Things only (every Reminders and Todoist task belongs to a List/Project.)
          return { type, id: `${sourceId}${id}`, title: "No Project or Area", icon: Icon.Dot };

        case reportGroupKey.tag.title: {
          // Group tags from different to-do apps together. To separate, use `${sourceId}${id}` for `id`.
          const tagName = todoTags?.get(sourceId)?.get(id) ?? id;
          return { type, id: tagName, title: tagName, icon: Icon.Tag };
        }

        case reportGroupKey.priority.title: {
          const priority = priorityNameAndColor[sourceId]?.[id];
          return {
            type,
            id: `${sourceId}${id}`,
            title: priority?.name ?? "No Priority",
            icon: priority?.icon ?? Icon.Dot,
          };
        }
      }
    }

    const { type, id } = group;
    switch (type) {
      case reportGroupKey.itemStatus.title:
        return { type, id, title: id, sortValue: Object.values(reportItemStatus).indexOf(id) };

      case reportGroupKey.completionDate.title:
        return { type, id, title: id, icon: id === "Incomplete" ? icon.incomplete : undefined };

      case reportGroupKey.taskBlock.title:
        return { type, id, title: id, icon: eventIcon.openTaskBlocks };

      case "event":
        return { ...eventGroup[id as EventGroupKey], children: [] };
    }
  };

  const groupReportItems = new Map<Group["id"], GroupReportItem>();
  const upsert = (group: Group, item: GroupReportItem | TodoReportItem | EventReportItem): void => {
    const groupReportItem = toGroupReportItem(group);
    const existing = groupReportItems.get(groupReportItem.id);
    if (!existing) {
      addItem(groupReportItem, item);
      groupReportItems.set(groupReportItem.id, groupReportItem);
    } else {
      addItem(existing, item, sortValueReducer !== "percentTracked" ? sortValueReducer : undefined);
    }
  };

  const newChildren: (GroupReportItem | TodoReportItem | EventReportItem)[] = [];

  for (const child of item.children) {
    const groupOrGroups = child.parentGroupOrGroups?.shift();
    if (groupOrGroups) {
      if (!Array.isArray(groupOrGroups)) {
        upsert(groupOrGroups, child);
      } else {
        for (const group of groupOrGroups) {
          upsert(group, child);
        }
      }
    } else {
      newChildren.push(child);
    }
  }

  for (const group of groupReportItems.values()) {
    updatePercentTracked(group, sortValueReducer === "percentTracked");
    newChildren.push(group);
  }

  item.children = newChildren;
}

function sortChildren(item: GroupReportItem, ascending: boolean): void {
  if (item.children && item.children.length > 1) {
    if (ascending) {
      const fallback = Number.MAX_SAFE_INTEGER;
      item.children.sort((a, b) => (a.sortValue ?? fallback) - (b.sortValue ?? fallback));
    } else {
      const fallback = Number.MIN_SAFE_INTEGER;
      item.children.sort((a, b) => (b.sortValue ?? fallback) - (a.sortValue ?? fallback));
    }
  }
}

function getTodoGroupTitleLookupTableGroupedByType(todoGroups: TodoGroup[]) {
  return new Map<TodoGroup["type"], Map<TodoGroup["id"], TodoGroup["title"]>>(
    Array.from(groupToMap(todoGroups, "type"), ([type, todoGroups]) => [
      type,
      new Map(todoGroups.map(({ id, title }) => [id, title])),
    ])
  );
}

export function buildReport(
  todos: Todo[] | undefined,
  todoGroups: Map<TodoSourceId, TodoGroup[]> | undefined,
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined,
  events: CalendarEventForReport[] | undefined,
  timeEntries: TimeEntry[] | null | undefined,
  options: ReportOptions
): GroupReportItem | null {
  if (!todos || !todoGroups || !todoTags || !events || timeEntries === undefined) {
    return null;
  }

  const { allocatedTimes, titleGroupedTimeEntries, otherEvents } = allocateBlocksAndTimeEntries(
    events,
    timeEntries,
    options.excludeWeekends
  );

  const report: GroupReportItem = {
    id: "-",
    title: "Total",
  };

  for (const todo of todos) {
    if (todo.status === TodoStatus.canceled) {
      continue;
    }

    if (
      !options.showUnscheduledOpenTodos &&
      todo.status === TodoStatus.open &&
      !allocatedTimes.has(getSourceIdedTodoId(todo.sourceId, todo.todoId))
    ) {
      continue;
    }

    if (
      options.excludeWeekends &&
      ((todo.completionDate && isWeekend(todo.completionDate)) ||
        (todo.startDate && isWeekend(todo.startDate)) ||
        (todo.dueDate && isWeekend(todo.dueDate)))
    ) {
      continue;
    }

    const titleMatchedTimeEntries = titleGroupedTimeEntries?.get(todo.title);
    const isTimeTracked = timeEntries !== null;
    addItem(report, toTodoReportItem(todo, allocatedTimes, titleMatchedTimeEntries, isTimeTracked, options));
  }

  for (const [groupKey, blocks] of Object.entries(otherEvents)) {
    if (isEventGroupKey(groupKey)) {
      for (const block of blocks) {
        addItem(report, toEventReportItem(groupKey, block));
      }
    }
  }

  updatePercentTracked(report);

  const todoGroupTitles = new Map(
    Array.from(todoGroups, ([sourceId, todoGroups]) => [
      sourceId,
      getTodoGroupTitleLookupTableGroupedByType(todoGroups),
    ])
  );

  const { groupKeys, sortDescriptor } = options;

  for (let i = 0, parents: GroupReportItem[] = [report]; parents.length > 0; i++) {
    const sortValueReducer = sortValueReducerFor[sortDescriptor.title];
    const nextParents: GroupReportItem[] = [];
    for (const parent of parents) {
      groupChildren(parent, todoGroupTitles, todoTags, sortValueReducer);
      if (sortValueReducer !== null || groupKeys[i] === reportGroupKey.itemStatus) {
        sortChildren(parent, sortDescriptor.ascending);
      }
      if (parent.children) {
        for (const child of parent.children) {
          if (isGroupReportItem(child)) {
            nextParents.push(child);
          }
        }
      }
    }
    parents = nextParents;
  }
  return report;
}
