import type { TodoSections } from "./types";
import { getTags } from "./tags";

export type TodoQuery = {
  /** Case-insensitive text to find in task titles. */
  query?: string;
  /** Exact tag name, including a leading # if the tag has one. "All" is a literal tag. Omit to include every tag. */
  tag?: string;
  /** Omit to include both incomplete and completed tasks. */
  status?: "all" | "incomplete" | "completed";
  /** Set true for pinned tasks, false for unpinned tasks, or omit for both. */
  pinned?: boolean;
  /** Omit to include all priorities. */
  priority?: "low" | "medium" | "high" | "none";
  /** Filter dates in the user's local timezone. Combine with status=incomplete for outstanding deadlines. */
  due?: "overdue" | "today" | "upcoming" | "none";
  /** Maximum results, from 1 to 100. Defaults to 50. */
  limit?: number;
  /** Number of matching tasks to skip. Use nextOffset to retrieve another page. */
  offset?: number;
};

export function allTodos(sections: TodoSections) {
  return [
    ...sections.pinned.map((item) => ({ ...item, pinned: true })),
    ...sections.todo.map((item) => ({ ...item, pinned: false })),
    ...sections.completed.map((item) => ({ ...item, pinned: false })),
  ];
}

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function searchTodos(sections: TodoSections, input: TodoQuery, now = new Date()) {
  const { start, end } = dayBounds(now);
  const query = input.query?.trim().toLowerCase();
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Limit must be an integer from 1 to 100.");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Offset must be a non-negative integer.");
  const matches = allTodos(sections).filter((item) => {
    if (query && !item.title.toLowerCase().includes(query)) return false;
    if (input.tag !== undefined && item.tag !== input.tag) return false;
    if (input.status === "incomplete" && item.completed) return false;
    if (input.status === "completed" && !item.completed) return false;
    if (input.pinned !== undefined && item.pinned !== input.pinned) return false;
    if (input.priority !== undefined) {
      const priority = { low: 1, medium: 2, high: 3, none: undefined }[input.priority];
      if (item.priority !== priority) return false;
    }
    switch (input.due) {
      case "overdue":
        return item.dueDate !== undefined && item.dueDate < now.getTime();
      case "today":
        return item.dueDate !== undefined && item.dueDate >= start && item.dueDate < end;
      case "upcoming":
        return item.dueDate !== undefined && item.dueDate >= end;
      case "none":
        return item.dueDate === undefined;
      case undefined:
        return true;
    }
  });
  const todos = matches.slice(offset, offset + limit);
  return {
    total: matches.length,
    todos,
    nextOffset: offset + todos.length < matches.length ? offset + todos.length : null,
  };
}

export function summarizeTodos(sections: TodoSections, now = new Date()) {
  const items = allTodos(sections);
  const incomplete = items.filter((item) => !item.completed);
  const { start, end } = dayBounds(now);
  return {
    total: items.length,
    incomplete: incomplete.length,
    completed: items.length - incomplete.length,
    pinned: items.filter((item) => item.pinned).length,
    overdue: incomplete.filter((item) => item.dueDate !== undefined && item.dueDate < now.getTime()).length,
    dueToday: incomplete.filter((item) => item.dueDate !== undefined && item.dueDate >= start && item.dueDate < end)
      .length,
    withoutDueDate: incomplete.filter((item) => item.dueDate === undefined).length,
    priorities: {
      high: incomplete.filter((item) => item.priority === 3).length,
      medium: incomplete.filter((item) => item.priority === 2).length,
      low: incomplete.filter((item) => item.priority === 1).length,
      none: incomplete.filter((item) => item.priority === undefined).length,
    },
    tags: getTags(sections).map((tag) => ({
      tag,
      incomplete: incomplete.filter((item) => item.tag === tag).length,
      completed: items.filter((item) => item.completed && item.tag === tag).length,
    })),
  };
}
