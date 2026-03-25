import { randomUUID } from "node:crypto";
import { instantEpochFromDate } from "../helpers/date-codecs";
import { buildTaskStartFields } from "../helpers/task-helpers";
import { getUserId, syncMutate } from "./client";
import type { TaskView } from "./types";

function buildMutateRequest(
  modelName: string,
  modelId: string,
  action: "INSERT" | "UPDATE" | "ARCHIVE" | "UNARCHIVE",
  payload: Record<string, unknown>,
) {
  return {
    batchId: randomUUID(),
    transactions: [
      {
        clientTxId: randomUUID(),
        clientId: randomUUID(),
        modelName,
        modelId,
        action,
        payload,
      },
    ],
  };
}

export async function createTask(
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
): Promise<string> {
  const id = randomUUID();
  const startFields = buildTaskStartFields(fields.view || "inbox");

  const payload: Record<string, unknown> = {
    id,
    title: fields.title,
    creatorId: await getUserId(),
    workspaceId,
    ...startFields,
  };

  if (fields.description) {
    payload.description = fields.description;
  }
  if (typeof fields.startDate !== "undefined") {
    payload.startDate = fields.startDate;
  }
  if (typeof fields.deadlineAt !== "undefined") {
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
}

export async function completeTask(taskId: string): Promise<void> {
  await syncMutate(
    buildMutateRequest("Task", taskId, "UPDATE", {
      completedAt: instantEpochFromDate(new Date()),
    }),
  );
}

export async function reopenTask(taskId: string): Promise<void> {
  await syncMutate(buildMutateRequest("Task", taskId, "UPDATE", { completedAt: null }));
}

export async function archiveTask(taskId: string): Promise<void> {
  await syncMutate(buildMutateRequest("Task", taskId, "ARCHIVE", {}));
}

export async function unarchiveTask(taskId: string): Promise<void> {
  await syncMutate(buildMutateRequest("Task", taskId, "UNARCHIVE", {}));
}

export async function createProject(
  workspaceId: string,
  fields: {
    name: string;
    key: string;
    description?: string;
    targetDate?: number;
  },
): Promise<string> {
  const id = randomUUID();

  const payload: Record<string, unknown> = {
    id,
    name: fields.name,
    key: fields.key,
    creatorId: await getUserId(),
    workspaceId,
  };

  if (fields.description) {
    payload.description = fields.description;
  }
  if (typeof fields.targetDate !== "undefined") {
    payload.targetDate = fields.targetDate;
  }

  await syncMutate(buildMutateRequest("Project", id, "INSERT", payload));
  return id;
}

export async function createChecklistItem(
  workspaceId: string,
  taskId: string,
  title: string,
  sortOrder: number,
): Promise<string> {
  const id = randomUUID();

  await syncMutate(
    buildMutateRequest("TaskChecklistItem", id, "INSERT", {
      id,
      title,
      taskId,
      workspaceId,
      sortOrder,
    }),
  );

  return id;
}
