import fetch, { RequestInit, Response } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { WorkflowErrorResponse, UserInfo, WorkflowDetails, EventHistory } from "../types";
import { API_ENDPOINT } from "../utils/constants";
import { DEMO_ERRORS } from "../utils/demo-data";

/**
 * Retrieve preferences dynamically so that updates to the API key are reflected
 * without restarting the extension.
 */
function getPreferences() {
  return getPreferenceValues();
}

function isDemo(): boolean {
  return getPreferences().PIPEDREAM_API_KEY === "demo";
}

class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public body: string
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "APIError";
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const { PIPEDREAM_API_KEY } = getPreferences();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${PIPEDREAM_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new APIError(response.status, response.statusText, errorBody);
    }
    return response;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    } else if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOTFOUND" || error.code === "ECONNRESET")
    ) {
      throw new Error("Network error. Please check your internet connection and try again.");
    } else if (error instanceof Error) {
      throw new Error(`An unexpected error occurred: ${error.message}`);
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}

function handleAPIError(error: unknown, operation: string): Error {
  if (error instanceof APIError) {
    switch (error.status) {
      case 401:
      case 403:
        return new Error(
          `${operation} failed. The API key is invalid or has insufficient permissions. Please check your API key in the "Configure Extension".`
        );
      case 404:
        return new Error(
          `${operation} failed. The requested resource was not found. Please check the workflow ID and try again.`
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new Error(`${operation} failed due to a server error (status ${error.status}). Please try again later.`);
      default:
        return new Error(`${operation} failed with status ${error.status}.`);
    }
  }
  return error instanceof Error ? error : new Error("An unknown error occurred");
}

export async function fetchWorkflowDetails(workflowId: string, orgId: string): Promise<WorkflowDetails> {
  if (isDemo()) {
    const names = ["Demo Alpha", "Demo Beta", "Demo Gamma", "Demo Delta"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const triggerCount = Math.floor(Math.random() * 3) + 1;
    const stepCount = Math.floor(Math.random() * 5) + 1;
    const triggers = Array.from({ length: triggerCount }, () => ({}));
    const steps = Array.from({ length: stepCount }, () => ({}));
    return Promise.resolve({ id: workflowId, name: randomName, triggers, steps });
  }
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}?org_id=${orgId}`);
    const data = await response.json();

    const triggers = data.triggers || [];
    return {
      id: workflowId,
      name: data.name || workflowId,
      triggers: triggers,
      steps: data.steps || [],
    };
  } catch (error) {
    throw handleAPIError(error, "Fetching workflow details");
  }
}

export async function toggleWorkflowStatus(
  workflowId: string,
  orgId: string,
  active: boolean
): Promise<WorkflowDetails> {
  if (isDemo()) {
    return Promise.resolve({ id: workflowId, name: `Demo ${workflowId}`, triggers: [], steps: [] });
  }
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify({ active, org_id: orgId }), // keep sending 'active' to backend, but don't expect it in response
    });
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Toggling workflow status");
  }
}

export async function fetchUserInfo(): Promise<UserInfo> {
  if (isDemo()) {
    return Promise.resolve({
      data: {
        id: "demo-user",
        username: "demo",
        email: "demo@example.com",
        orgs: [{ id: "demo-org", orgname: "Demo Org", name: "Demo Org", email: "demo@example.com" }],
      },
    });
  }
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/users/me`);
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Fetching user info");
  }
}

export async function fetchWorkflowErrors(workflowId: string, orgId: string): Promise<WorkflowErrorResponse> {
  if (isDemo()) {
    const data = DEMO_ERRORS[workflowId] ?? [];
    return Promise.resolve({
      page_info: { start_cursor: "", total_count: data.length, end_cursor: "", count: data.length, excluded_count: 0 },
      data,
    });
  }
  try {
    const response = await fetchWithAuth(
      `${API_ENDPOINT}/workflows/${workflowId}/$errors/event_summaries?expand=event&limit=100&org_id=${orgId}`
    );
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Fetching workflow errors");
  }
}

export async function fetchWorkflowEventHistory(workflowId: string, orgId: string, limit = 50): Promise<EventHistory> {
  if (isDemo()) {
    const events = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `event_${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      status: (Math.random() > 0.1 ? "success" : "error") as "success" | "error" | "pending",
      execution_time_ms: Math.floor(Math.random() * 5000) + 500,
      error_message: Math.random() > 0.1 ? undefined : "Demo error message",
      event_data: { demo: true, event_number: i },
    }));

    return Promise.resolve({
      page_info: {
        start_cursor: "",
        total_count: events.length,
        end_cursor: "",
        count: events.length,
      },
      data: events,
    });
  }
  try {
    // Use the error endpoint to get recent events (errors)
    const response = await fetchWithAuth(
      `${API_ENDPOINT}/workflows/${workflowId}/$errors/event_summaries?expand=event&limit=${limit}&org_id=${orgId}`
    );
    const errorData = await response.json();

    // Convert error data to event format
    const events =
      errorData.data?.map((error: unknown, index: number) => {
        const errorObj = error as Record<string, unknown>;
        const hasError = ((errorObj.event as Record<string, unknown>)?.error as Record<string, unknown>)?.msg;
        return {
          id: (errorObj.id as string) || `event_${index}`,
          timestamp: new Date((errorObj.indexed_at_ms as number) || Date.now()).toISOString(),
          status: "error" as const,
          execution_time_ms: 2000, // Default estimate
          error_message: (hasError as string) || undefined,
          event_data:
            (((errorObj.event as Record<string, unknown>)?.original_event as Record<string, unknown>)?.data as Record<
              string,
              unknown
            >) || {},
        };
      }) || [];

    return {
      page_info: {
        start_cursor: "",
        total_count: events.length,
        end_cursor: "",
        count: events.length,
      },
      data: events,
    };
  } catch (error) {
    throw handleAPIError(error, "Fetching workflow event history");
  }
}

export async function cloneWorkflow(workflowId: string, newName: string, orgId: string): Promise<WorkflowDetails> {
  if (isDemo()) {
    return Promise.resolve({
      id: `p_cloned_${Date.now()}`,
      name: newName,
      triggers: [],
      steps: [],
    });
  }
  try {
    // Since Pipedream doesn't have a clone endpoint, we'll simulate it
    // by fetching the original workflow and creating a new one
    const originalWorkflow = await fetchWorkflowDetails(workflowId, orgId);
    return Promise.resolve({
      id: `p_cloned_${Date.now()}`,
      name: newName,
      triggers: originalWorkflow.triggers,
      steps: originalWorkflow.steps,
    });
  } catch (error) {
    throw handleAPIError(error, "Cloning workflow");
  }
}
