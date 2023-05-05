import { Image } from "@raycast/api";
import { DetailedTodo, TimeValueInterval, Todo, TodoGroupCore, TodoTag } from "../../types";

export interface TodoSourceList extends TodoGroupCore {
  icon: Image.Source;
  isToday?: boolean;
}

export interface QueryFilter {
  listId?: string;
  todoIds?: Todo["todoId"][];
  interval?: TimeValueInterval;
  forDetail?: boolean;
}

export interface TodoFormData {
  title: Todo["title"];
  startDate: Todo["startDate"];
  dueDate: Todo["dueDate"];
  priority: Todo["priority"];
  group: TodoGroupCore; // `name` required for time entry updates
  tags: TodoTag[] | null; // `name` required for time entry updates
  notes: DetailedTodo["notes"];
}

export interface UpdateTodoData extends TodoFormData {
  status: Todo["status"];
  priority: NonNullable<Todo["priority"]>;
}

export interface Reminder {
  readonly id: string;
  readonly title: string;
  readonly completed: number; // boolean represented as number (0 or 1)
  readonly startDate: number | null;
  readonly dueDate: number | null;
  readonly completionDate: number | null;
  readonly allDay: number; // boolean represented as number (0 or 1)
  readonly priority: number;
  readonly listId: string;
  readonly joinedTagNames: string | null;
  readonly joinedSubtaskIds: string | null;
}

export interface DetailedReminder extends Reminder {
  readonly notes: string | null;
}

export interface ThingsTask {
  readonly id: string;
  readonly title: string;
  readonly status: number;
  readonly startDate: number | null;
  readonly dueDate: number | null;
  readonly stopDate: number | null;
  readonly parentType: "area" | "project" | null;
  readonly parentId: string | null;
  readonly concatenatedTagIds: string | null;
}

export interface ThingsDetailedTask extends ThingsTask {
  readonly notes: string | null;
  readonly concatenatedChecklistItems: string | null;
}

export type OptionalAction = "setStartDate" | "setPriority" | "markAsCanceled";
