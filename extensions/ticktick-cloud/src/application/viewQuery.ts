import type { Task } from "../domain/task";

export interface SelectionContext {
  now: Date;
  timeZone: string;
}

export interface TaskSection {
  id: string;
  title: string;
  tasks: Task[];
}

export interface TaskViewQuery {
  view: "today" | "next7Days" | "inbox" | "search";
  status: "open" | "completed" | "all";
  searchText?: string;
  projectId?: string;
}
