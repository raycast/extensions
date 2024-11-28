import type { Action } from "@raycast/api";

export interface DatabaseView {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;
  create_properties?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sort_by?: Record<string, any>;
  type?: "kanban" | "list";
  name?: string | null;
  kanban?: KanbanView;
}

export interface KanbanView {
  property_id: string;
  backlog_ids: string[];
  not_started_ids: string[];
  started_ids: string[];
  completed_ids: string[];
  canceled_ids: string[];
}

export type UnwrapRecord<T> = T extends Record<never, infer U> ? U : never;
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : never;
export type UnwrapArray<T> = T extends Array<infer U> ? U : never;

export type Quicklink = Action.CreateQuicklink.Props["quicklink"];
