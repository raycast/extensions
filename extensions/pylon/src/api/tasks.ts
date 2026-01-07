import { post, patch } from "./client";
import type {
  Task,
  Issue,
  CreateTaskPayload,
  UpdateTaskPayload,
  ApiResponse,
  PaginatedResponse,
  SearchRequest,
} from "./types";
import { issueToTask, taskStatusToIssueState } from "./types";

// Get tasks/issues using the issues/search endpoint
export async function getTasks(filters?: Record<string, unknown>): Promise<Task[]> {
  const searchRequest: SearchRequest = {
    filters: filters || {},
  };
  const response = await post<PaginatedResponse<Issue>>("/issues/search", searchRequest);
  return response.data.map(issueToTask);
}

// Get tasks by assignee
export async function getTasksByAssignee(assigneeId: string): Promise<Task[]> {
  return getTasks({ assignee_id: { equals: assigneeId } });
}

// Get tasks by account
export async function getTasksByAccount(accountId: string): Promise<Task[]> {
  return getTasks({ account_id: { equals: accountId } });
}

// Create a new task
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const response = await post<ApiResponse<Task>>("/tasks", payload);
  return response.data;
}

// Update a task (for tasks created via /tasks endpoint)
export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  // Try updating as issue first (since most items are issues)
  try {
    const issuePayload: Record<string, unknown> = {};

    if (payload.status) {
      issuePayload.state = taskStatusToIssueState(payload.status);
    }

    if (payload.assignee_id) {
      issuePayload.assignee_id = payload.assignee_id;
    }

    const response = await patch<ApiResponse<Issue>>(`/issues/${id}`, issuePayload);
    return issueToTask(response.data);
  } catch (issueError) {
    // If issue update fails (likely a task, not an issue), try task endpoint
    try {
      const response = await patch<ApiResponse<Task>>(`/tasks/${id}`, payload);
      return response.data;
    } catch (taskError) {
      // Both endpoints failed - throw the original issue error as it's more likely
      // to be relevant since most items are issues
      console.error("Failed to update as issue:", issueError);
      console.error("Failed to update as task:", taskError);
      throw issueError;
    }
  }
}
