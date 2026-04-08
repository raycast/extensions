import { randomUUID } from "node:crypto";

import { instantEpochFromDate } from "../helpers/date-codecs";
import { buildTaskStartFields } from "../helpers/task-helpers";
import { getUserId, syncMutate } from "./client";
import type { TaskView } from "./types";

const buildMutateRequest = (
  modelName: string,
  modelId: string,
  action: "INSERT" | "UPDATE" | "ARCHIVE" | "UNARCHIVE",
  payload: Record<string, unknown>,
) => ({
  batchId: randomUUID(),
  transactions: [
    {
      action,
      clientId: randomUUID(),
      clientTxId: randomUUID(),
      modelId,
      modelName,
      payload,
    },
  ],
});

export const createTask = async (
  workspaceId: string,
  fields: {
    title: string;
    description?: string;
    view?: TaskView;
    startDate?: number;
    deadlineAt?: number;
    projectId?: string;
    teamId?: string;
    assigneeId?: string;
  },
): Promise<string> => {
  const id = randomUUID();
  const startFields = buildTaskStartFields(fields.view || "inbox");

  const payload: Record<string, unknown> = {
    creatorId: await getUserId(),
    id,
    title: fields.title,
    workspaceId,
    ...startFields,
  };

  if (fields.description) {
    payload.description = fields.description;
  }
  if (fields.startDate !== undefined) {
    payload.startDate = fields.startDate;
  }
  if (fields.deadlineAt !== undefined) {
    payload.deadlineAt = fields.deadlineAt;
  }
  if (fields.projectId) {
    payload.projectId = fields.projectId;
  }
  if (fields.teamId) {
    payload.teamId = fields.teamId;
  }
  if (fields.assigneeId) {
    payload.assigneeId = fields.assigneeId;
  }

  await syncMutate(buildMutateRequest("Task", id, "INSERT", payload));
  return id;
};

export const completeTask = async (taskId: string): Promise<void> => {
  await syncMutate(
    buildMutateRequest("Task", taskId, "UPDATE", {
      completedAt: instantEpochFromDate(new Date()),
    }),
  );
};

export const reopenTask = async (taskId: string): Promise<void> => {
  await syncMutate(buildMutateRequest("Task", taskId, "UPDATE", { completedAt: null }));
};

export const archiveTask = async (taskId: string): Promise<void> => {
  await syncMutate(buildMutateRequest("Task", taskId, "ARCHIVE", {}));
};

export const unarchiveTask = async (taskId: string): Promise<void> => {
  await syncMutate(buildMutateRequest("Task", taskId, "UNARCHIVE", {}));
};

export const createProject = async (
  workspaceId: string,
  fields: {
    name: string;
    key: string;
    description?: string;
    targetDate?: number;
  },
): Promise<string> => {
  const id = randomUUID();

  const payload: Record<string, unknown> = {
    creatorId: await getUserId(),
    id,
    key: fields.key,
    name: fields.name,
    workspaceId,
  };

  if (fields.description) {
    payload.description = fields.description;
  }
  if (fields.targetDate !== undefined) {
    payload.targetDate = fields.targetDate;
  }

  await syncMutate(buildMutateRequest("Project", id, "INSERT", payload));
  return id;
};

export const createChecklistItem = async (
  workspaceId: string,
  taskId: string,
  title: string,
  sortOrder: number,
): Promise<string> => {
  const id = randomUUID();

  await syncMutate(
    buildMutateRequest("TaskChecklistItem", id, "INSERT", {
      id,
      sortOrder,
      taskId,
      title,
      workspaceId,
    }),
  );

  return id;
};
