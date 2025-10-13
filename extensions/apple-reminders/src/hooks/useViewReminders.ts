import { Icon, Image, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { format, isBefore, parseISO, startOfDay, add as addDate } from "date-fns";
import { compareAsc } from "date-fns";
import { partition } from "lodash";
import React, { useMemo } from "react";
import { getCompletedReminders } from "swift:../../swift/AppleReminders";

import { displayDueDate, getDateString, isFullDay, isOverdue, isToday } from "../helpers";

import { Data, Priority, Reminder } from "./useData";

const { useTimeOfDayGrouping } = getPreferenceValues<Preferences.MyReminders>();

export type SortByOption = "default" | "dueDate" | "priority" | "title" | "creationDate";

export type SortByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: SortByOption;
}[];

export type SortByProp = {
  value: SortByOption;
  setValue: React.Dispatch<React.SetStateAction<SortByOption>>;
  options: SortByOptions;
};

export const sortByOptions: SortByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Due Date", icon: Icon.List, value: "dueDate" },
  { label: "Priority", icon: Icon.Exclamationmark, value: "priority" },
  { label: "Title", icon: Icon.Lowercase, value: "title" },
  { label: "Creation Date", icon: Icon.Clock, value: "creationDate" },
];

export function sortByTitle(a: Reminder, b: Reminder): number {
  return a.title.localeCompare(b.title);
}

export function sortByDate(a: Reminder, b: Reminder): number {
  if (!a.dueDate && !b.dueDate) {
    return 0;
  }
  if (!a.dueDate) {
    return 1;
  }
  if (!b.dueDate) {
    return -1;
  }

  return compareAsc(new Date(a.dueDate), new Date(b.dueDate));
}

export function sortByCreationDate(a: Reminder, b: Reminder): number {
  return compareAsc(a?.creationDate ?? new Date(), b?.creationDate ?? new Date());
}

export function sortByPriority(a: Reminder, b: Reminder): number {
  const priorityMap: Record<Exclude<Priority, null>, number> = { low: 1, medium: 2, high: 3 };

  const aPriority = a.priority ? priorityMap[a.priority] : 0;
  const bPriority = b.priority ? priorityMap[b.priority] : 0;

  return aPriority - bPriority;
}

export type OrderByOption = "asc" | "desc";

type OrderByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: OrderByOption;
}[];

export function applySortOrder(orderBy: OrderByOption, sortFunc: (a: Reminder, b: Reminder) => number) {
  return orderBy === "desc" ? (a: Reminder, b: Reminder) => sortFunc(b, a) : sortFunc;
}

export type GroupByOption = "default" | "dueDate" | "upcoming" | "priority";

export type GroupByOptions = {
  label: string;
  icon: Image.ImageLike;
  value: GroupByOption;
}[];

export type GroupByProp = {
  value: GroupByOption;
  setValue: React.Dispatch<React.SetStateAction<GroupByOption>>;
  options: GroupByOptions;
};

export const groupByOptions: GroupByOptions = [
  { label: "Default", icon: Icon.Document, value: "default" },
  { label: "Due Date", icon: Icon.Clock, value: "dueDate" },
  { label: "Upcoming", icon: Icon.Calendar, value: "upcoming" },
  { label: "Priority", icon: Icon.Exclamationmark, value: "priority" },
];

export function groupByDueDates(reminders: Reminder[]) {
  const [dated, notDated] = partition(reminders, (reminder: Reminder) => !!reminder.dueDate);
  const [overdue, upcoming] = partition(dated, (reminder: Reminder) => reminder.dueDate && isOverdue(reminder.dueDate));
  const allDueDates = [...new Set(upcoming.map((reminder) => getDateString(reminder.dueDate as string)))];
  allDueDates.sort();

  const sections: Section[] = [];
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");

  const overdueReminders = useTimeOfDayGrouping
    ? overdue.filter((reminder) => reminder.dueDate && isBefore(reminder.dueDate, today))
    : overdue;

  if (overdueReminders.length > 0) {
    sections.unshift({
      title: "Overdue",
      reminders: overdueReminders,
    });
  }

  if (useTimeOfDayGrouping) {
    const todayReminders = dated.filter((reminder) => getDateString(reminder.dueDate as string) === today);

    if (todayReminders.length > 0) {
      const allDayReminders = todayReminders.filter((reminder) => isFullDay(reminder.dueDate as string));
      const timedReminders = todayReminders.filter((reminder) => !isFullDay(reminder.dueDate as string));

      if (allDayReminders.length > 0) {
        sections.push({ title: "Today", reminders: allDayReminders });
      }

      const morning = timedReminders.filter((reminder) => new Date(reminder.dueDate as string).getHours() < 12);
      const afternoon = timedReminders.filter(
        (reminder) =>
          new Date(reminder.dueDate as string).getHours() >= 12 && new Date(reminder.dueDate as string).getHours() < 17,
      );
      const tonight = timedReminders.filter((reminder) => new Date(reminder.dueDate as string).getHours() >= 17);

      if (morning.length > 0) sections.push({ title: "Morning", reminders: morning });
      if (afternoon.length > 0) sections.push({ title: "Afternoon", reminders: afternoon });
      if (tonight.length > 0) sections.push({ title: "Tonight", reminders: tonight });
    }
  }

  const remindersOnDate = useTimeOfDayGrouping
    ? allDueDates.filter((date) => !isBefore(date, today))
    : allDueDates.filter((date) => date);

  remindersOnDate.forEach((date) => {
    const remindersOnDate = upcoming.filter((reminder) => getDateString(reminder.dueDate as string) === date);
    sections.push({
      title: displayDueDate(date),
      reminders: remindersOnDate,
    });
  });

  if (notDated.length > 0) {
    sections.push({
      title: "No due date",
      reminders: notDated,
    });
  }

  return sections;
}

export function groupByPriorities(reminders: Reminder[]) {
  const priorities: { name: string; value: Priority }[] = [
    { name: "High", value: "high" },
    { name: "Medium", value: "medium" },
    { name: "Low", value: "low" },
  ];

  const [noPriorityReminders, remindersWithPriority] = partition(reminders, (reminder) => !reminder.priority);

  const sections = [
    ...priorities.map((priority) => {
      return {
        title: priority.name,
        reminders: remindersWithPriority.filter((reminder) => reminder.priority === priority.value),
      };
    }),
    { title: "No Priority", reminders: noPriorityReminders },
  ];

  return sections;
}

export function groupByUpcoming(reminders: Reminder[]) {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const nextWeek = addDate(today, { days: 7 });

  const [dated, notDated] = partition(reminders, (reminder: Reminder) => !!reminder.dueDate);
  const [overdue, upcoming] = partition(dated, (reminder: Reminder) => reminder.dueDate && isOverdue(reminder.dueDate));
  const [upcomingToday, upcomingRest] = partition(
    upcoming,
    (reminder: Reminder) => getDateString(reminder.dueDate as string) === today,
  );
  const [upcomingSoon, other] = partition(upcomingRest, (reminder: Reminder) =>
    isBefore(reminder.dueDate as string, nextWeek),
  );
  other.push(...notDated);

  return [
    { title: "Overdue", reminders: overdue },
    { title: "Today", reminders: upcomingToday },
    { title: "Upcoming", reminders: upcomingSoon },
    { title: "Later", reminders: other },
  ];
}

type ViewProp<T, U> = {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  options: U;
};

export type ViewProps = {
  groupBy?: ViewProp<GroupByOption, GroupByOptions>;
  sortBy: ViewProp<SortByOption, SortByOptions>;
  orderBy?: ViewProp<OrderByOption, OrderByOptions>;
  completed: { value: boolean; toggle: () => void };
};

export type Section = {
  title: string;
  subtitle?: string;
  reminders: Reminder[];
};

export default function useViewReminders(listId: string, { data }: { data?: Data }) {
  const [showCompletedReminders, setShowCompletedReminders] = useCachedState(
    `show-completed-reminders-${listId}`,
    false,
  );

  const { data: completedRemindersData } = useCachedPromise(
    (listId) => getCompletedReminders(listId === "all" ? undefined : listId),
    [listId],
    { execute: showCompletedReminders },
  );

  const viewDefault = listId === "today" || listId === "scheduled" || listId === "overdue" ? "dueDate" : "default";

  const [sortBy, setSortBy] = useCachedState<SortByOption>(`sort-by-${listId}`, viewDefault);
  const [groupBy, setGroupBy] = useCachedState<GroupByOption>(`group-by-${listId}`, viewDefault);
  const [orderBy, setOrderBy] = useCachedState<OrderByOption>(`order-by-${listId}`, "asc");

  function filterRemindersByListId(listId: string) {
    return (reminder: Reminder) => {
      if (listId === "all") return true;
      if (listId === "today")
        return reminder.dueDate ? isOverdue(reminder.dueDate) || isToday(reminder.dueDate) : false;
      if (listId === "overdue") return reminder.dueDate ? isOverdue(reminder.dueDate) : false;
      if (listId === "scheduled") return !!reminder.dueDate;
      return reminder.list?.id === listId;
    };
  }

  const reminders = useMemo(() => {
    return data?.reminders.filter(filterRemindersByListId(listId)) ?? [];
  }, [listId, data?.reminders]);

  const completedReminders = useMemo(() => {
    return completedRemindersData?.filter(filterRemindersByListId(listId)) ?? [];
  }, [listId, completedRemindersData]);

  const { sortByProp, sortedReminders, orderByProp } = useMemo(() => {
    const sortedReminders = [...reminders];

    switch (sortBy) {
      case "title":
        sortedReminders.sort(applySortOrder(orderBy, sortByTitle));
        break;
      case "dueDate":
        sortedReminders.sort(applySortOrder(orderBy, sortByDate));
        break;
      case "creationDate":
        sortedReminders.sort(applySortOrder(orderBy, sortByCreationDate));
        break;
      case "priority":
        sortedReminders.sort(applySortOrder(orderBy, sortByPriority));
        break;
      default:
        break;
    }

    const sortByProp = {
      value: sortBy,
      setValue: setSortBy,
      options: sortByOptions,
    };

    let orderByOptions: OrderByOptions;

    switch (sortBy) {
      case "dueDate":
        orderByOptions = [
          { label: "Earliest first", icon: Icon.ArrowUp, value: "asc" },
          { label: "Latest first", icon: Icon.ArrowDown, value: "desc" },
        ];
        break;
      case "priority":
        orderByOptions = [
          { label: "Highest first", icon: Icon.ArrowDown, value: "desc" },
          { label: "Lowest first", icon: Icon.ArrowUp, value: "asc" },
        ];
        break;
      default:
        orderByOptions = [
          { label: "Ascending", icon: Icon.ArrowUp, value: "asc" },
          { label: "Descending", icon: Icon.ArrowDown, value: "desc" },
        ];
    }

    const orderByProp = {
      value: orderBy,
      setValue: setOrderBy,
      options: orderByOptions,
    };

    return { sortedReminders, sortByProp, orderByProp };
  }, [reminders, sortBy, setSortBy, orderBy, setOrderBy]);

  const { sections, groupByProp } = useMemo(() => {
    let sections: Section[] = [];

    switch (groupBy) {
      case "default": {
        let title = "Reminders";
        if (listId === "all") {
          title = "All";
        } else if (listId === "today") {
          title = "Today";
        } else if (listId === "overdue") {
          title = "Overdue";
        } else if (listId === "scheduled") {
          title = "Scheduled";
        } else {
          title = data?.lists.find((list) => list.id === listId)?.title ?? "Reminders";
        }

        sections = [{ title, reminders: sortedReminders }];
        break;
      }
      case "dueDate":
        sections = groupByDueDates(sortedReminders);
        break;
      case "upcoming":
        sections = groupByUpcoming(sortedReminders);
        break;
      case "priority":
        sections = groupByPriorities(sortedReminders);
        break;
    }

    if (showCompletedReminders) {
      sections.push({
        title: "Completed",
        reminders: completedReminders
          ? completedReminders.sort((a, b) => {
              return isBefore(parseISO(b.completionDate), parseISO(a.completionDate)) ? -1 : 1;
            })
          : [],
      });
    }

    sections = sections.map((section) => {
      return {
        ...section,
        subtitle: `${section.reminders.length} ${section.reminders.length === 1 ? "reminder" : "reminders"}`,
      };
    });

    const groupByProp = {
      value: groupBy,
      setValue: setGroupBy,
      options: groupByOptions,
    };

    return { sections, groupByProp };
  }, [sortedReminders, groupBy, setGroupBy, completedReminders, showCompletedReminders, data, listId]);

  const viewProps: ViewProps = {
    groupBy: groupByProp,
    sortBy: sortByProp,
    orderBy: sortBy === "default" ? undefined : orderByProp,
    completed: {
      value: showCompletedReminders,
      toggle: () => setShowCompletedReminders((prev) => !prev),
    },
  };

  return { sections, sortedReminders, viewProps };
}
