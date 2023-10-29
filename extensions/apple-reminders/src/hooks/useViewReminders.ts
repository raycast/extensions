import { Icon, Image } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { format, isBefore, parseISO } from "date-fns";
import { compareAsc } from "date-fns";
import { partition } from "lodash";
import { useMemo } from "react";
import React from "react";

import { displayDueDate, isOverdue } from "../helpers";

import { Data, Priority, Reminder } from "./useData";

export type SortByOption = "default" | "dueDate" | "priority" | "title";

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

export type GroupByOption = "default" | "dueDate" | "priority";

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
  { label: "Due Date", icon: Icon.Calendar, value: "dueDate" },
  { label: "Priority", icon: Icon.Exclamationmark, value: "priority" },
];

export function groupByDueDates(reminders: Reminder[]) {
  const [dated, notDated] = partition(reminders, (reminder: Reminder) => reminder.dueDate !== null);
  const [overdue, upcoming] = partition(dated, (reminder: Reminder) => reminder.dueDate && isOverdue(reminder.dueDate));

  const allDueDates = [
    ...new Set(upcoming.map((reminder) => format(parseISO(reminder.dueDate as string), "yyyy-MM-dd"))),
  ] as string[];
  allDueDates.sort();

  const sections = allDueDates.map((date) => {
    const remindersOnDate = upcoming.filter((reminder) => {
      const reminderDate = format(parseISO(reminder.dueDate as string), "yyyy-MM-dd");
      return reminderDate === date;
    });
    return {
      title: displayDueDate(date),
      reminders: remindersOnDate,
    };
  });

  if (overdue.length > 0) {
    sections.unshift({
      title: "Overdue",
      reminders: overdue,
    });
  }

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
  const [sortBy, setSortBy] = useCachedState<SortByOption>(`sort-by-${listId}`, "default");
  const [groupBy, setGroupBy] = useCachedState<GroupByOption>(`group-by-${listId}`, "default");
  const [orderBy, setOrderBy] = useCachedState<OrderByOption>(`order-by-${listId}`, "asc");

  const reminders = useMemo(() => data?.reminders ?? [], [data]);

  const filteredReminders = useMemo(() => {
    return (
      reminders.filter((reminder) => {
        if (listId === "all") return true;
        return reminder.list?.id === listId;
      }) ?? []
    );
  }, [listId, reminders]);

  const { sortByProp, sortedReminders, orderByProp } = useMemo(() => {
    const sortedReminders = [...filteredReminders];

    switch (sortBy) {
      case "title":
        sortedReminders.sort(applySortOrder(orderBy, sortByTitle));
        break;
      case "dueDate":
        sortedReminders.sort(applySortOrder(orderBy, sortByDate));
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
  }, [filteredReminders, sortBy, setSortBy, orderBy, setOrderBy]);

  const { sections, groupByProp } = useMemo(() => {
    let sections: Section[] = [];

    const [completedReminders, incompleteReminders] = partition([...sortedReminders], "isCompleted");

    switch (groupBy) {
      case "default": {
        const title = listId === "all" ? "All" : data?.lists.find((list) => list.id === listId)?.title ?? "Reminders";
        sections = [{ title, reminders: incompleteReminders }];
        break;
      }
      case "dueDate":
        sections = groupByDueDates(incompleteReminders);
        break;
      case "priority":
        sections = groupByPriorities(incompleteReminders);
        break;
    }

    if (showCompletedReminders) {
      sections.push({
        title: "Completed",
        reminders: completedReminders.sort((a, b) => {
          return isBefore(parseISO(b.completionDate), parseISO(a.completionDate)) ? -1 : 1;
        }),
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
  }, [sortedReminders, groupBy, setGroupBy, showCompletedReminders, data, listId]);

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
