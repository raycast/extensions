import { CreateTaskValues, buildCreateTaskPayload } from "./TaskPayload";
import { requireSuccessfulTaskApiResponse, taskApiRequest } from "./TaskApi";

export interface CreatedTask {
  id: string;
  name: string;
  taskIdentifier?: string;
  projectId?: string;
}

export interface CreateTaskResult {
  task: CreatedTask;
  assigneeError?: Error;
}

const postWithTokenRefresh = (path: string, token: string, body: string) =>
  taskApiRequest(path, token, {
    method: "POST",
    body,
  });

export const createTask = async (token: string, values: CreateTaskValues): Promise<CreateTaskResult> => {
  const createResult = await requireSuccessfulTaskApiResponse(
    await postWithTokenRefresh("tasks", token, JSON.stringify(buildCreateTaskPayload(values))),
  );

  const task = (await createResult.response.json()) as CreatedTask;
  if (values.projectId === "none" || values.assigneeIds.length === 0) {
    return { task };
  }

  try {
    const assigneeResult = await postWithTokenRefresh(
      `tasks/${task.id}/setassignees`,
      createResult.token,
      JSON.stringify(values.assigneeIds),
    );
    await requireSuccessfulTaskApiResponse(assigneeResult);
  } catch (error) {
    return { task, assigneeError: error instanceof Error ? error : new Error(String(error)) };
  }

  return { task };
};
