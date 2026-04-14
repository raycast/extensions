import { Action, Alert, confirmAlert } from "@raycast/api";
import type { ComponentProps } from "react";
import {
  buildTaskDetailActionSpecs as buildTaskDetailFlowSpecs,
  buildTaskFilterActionSpecs as buildTaskFilterFlowSpecs,
  buildTaskListActionSpecs as buildTaskListFlowSpecs,
  type TaskActionSpec as TaskFlowSpec,
} from "../lib/task-flow";
import { runTaskMutationAction } from "../lib/task-actions";
import type { RaylogRepository } from "../lib/storage";
import { getTaskActionIcon } from "../lib/task-visuals";
import type {
  TaskLogStatusBehavior,
  TaskRecord,
  TaskViewFilter,
} from "../lib/types";
import TaskDetailView from "./TaskDetailView";
import TaskForm from "./TaskForm";

type TaskDetailViewComponentProps = ComponentProps<typeof TaskDetailView>;
type TaskFormComponentProps = ComponentProps<typeof TaskForm>;

export interface TaskActionSpec {
  title: string;
  icon?: ComponentProps<typeof Action>["icon"];
  shortcut?: TaskFlowSpec["shortcut"];
  style?: Action.Style;
  target?: ComponentProps<typeof Action.Push>["target"];
  onAction?: () => Promise<void> | void;
  targetType?: string;
}

interface SharedTaskActionSpecOptions {
  notePath: string;
  repository: RaylogRepository;
  task: TaskRecord;
  taskLogStatusBehavior: TaskLogStatusBehavior;
  onReload: () => Promise<void>;
}

export function buildTaskFilterActionSpecs(
  onSelectFilter: (filter: TaskViewFilter) => Promise<void> | void,
): TaskActionSpec[] {
  return buildTaskFilterFlowSpecs(onSelectFilter).map(adaptFlowSpec);
}

export function buildTaskListActionSpecs(
  options: SharedTaskActionSpecOptions,
): TaskActionSpec[] {
  return buildTaskListFlowSpecs(options).map(adaptFlowSpec);
}

export function buildTaskDetailActionSpecs(
  options: SharedTaskActionSpecOptions & {
    onDidDelete: () => Promise<void> | void;
  },
): TaskActionSpec[] {
  return buildTaskDetailFlowSpecs(options).map(adaptFlowSpec);
}

function adaptFlowSpec(spec: TaskFlowSpec): TaskActionSpec {
  if (spec.kind === "target") {
    return {
      title: spec.title,
      icon: getTaskActionIcon(spec.title),
      shortcut: spec.shortcut,
      targetType: spec.target.type,
      target: renderTarget(spec.target),
    };
  }

  return {
    title: spec.title,
    icon: getTaskActionIcon(spec.title),
    shortcut: spec.shortcut,
    style: spec.destructive ? Action.Style.Destructive : undefined,
    onAction: buildMutationAction(spec),
  };
}

function renderTarget(
  target: Extract<TaskFlowSpec, { kind: "target" }>["target"],
): ComponentProps<typeof Action.Push>["target"] {
  switch (target.type) {
    case "TaskDetailView":
      return (
        <TaskDetailView
          {...(target.props as unknown as TaskDetailViewComponentProps)}
        />
      );
    case "TaskForm":
      return (
        <TaskForm {...(target.props as unknown as TaskFormComponentProps)} />
      );
  }
}

function buildMutationAction(
  spec: Extract<TaskFlowSpec, { kind: "mutation" }>,
): () => Promise<void> {
  switch (spec.mutation) {
    case "complete":
      return async () => {
        await runTaskMutationAction(spec.title, spec.run);
      };
    case "start":
      return async () => {
        await runTaskMutationAction(spec.title, spec.run);
      };
    case "reopen":
      return async () => {
        await runTaskMutationAction(spec.title, spec.run);
      };
    case "archive":
      return async () => {
        await runTaskMutationAction(spec.title, spec.run);
      };
    case "delete":
      return async () => {
        const confirmed = await confirmAlert({
          title: "Delete task?",
          message: "This permanently removes the task from the storage note.",
          icon: getTaskActionIcon("Delete Task"),
          primaryAction: {
            title: "Delete Task",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (!confirmed) {
          return;
        }

        await runTaskMutationAction(spec.title, spec.run);
      };
    case "custom":
      return spec.run;
  }
}
