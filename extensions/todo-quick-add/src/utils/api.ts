/**
 * Local API client to communicate with the To-Do app
 */

import { ParsedTask } from "../types";

const API_URL = "http://localhost:51234";

export interface AddTaskRequest {
  title: string;
  priority?: string;
  dueDate?: number; // milliseconds timestamp
  tagIds: string[];
}

export interface AddTaskResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Add a task via the local To-Do app API
 */
export async function addTaskViaApp(parsed: ParsedTask): Promise<AddTaskResponse> {
  const request: AddTaskRequest = {
    title: parsed.cleanedText,
    priority: parsed.priority,
    dueDate: parsed.dueDate?.getTime(),
    tagIds: parsed.tagIds,
  };

  try {
    const response = await fetch(`${API_URL}/add-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        "❌ Cannot connect to To-Do app.\n\n" +
          "Please make sure:\n" +
          "1. The To-Do app is installed and running\n" +
          "2. You're signed in to the app\n" +
          "3. The app is not blocked by firewall\n\n" +
          "The app must be running for Raycast integration to work."
      );
    }
    throw error;
  }
}

/**
 * Check if the To-Do app is running and accessible
 */
export async function checkAppConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/ping`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}
