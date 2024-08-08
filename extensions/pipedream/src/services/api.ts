import fetch, { RequestInit, Response } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { WorkflowErrorResponse, Preferences, UserInfo, WorkflowDetails } from "../types";
import { API_ENDPOINT } from "../utils/constants";

const preferences = getPreferenceValues<Preferences>();

class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "APIError";
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${preferences.PIPEDREAM_API_KEY}`,
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
    } else if (error instanceof Error) {
      throw new Error("Network error. Please check your internet connection.");
    } else {
      throw new Error("An unknown error occurred");
    }
  }
}

function handleAPIError(error: unknown, operation: string): Error {
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new Error(`${operation} failed. Please check your API key in the "Configure Extension".`);
    } else {
      return new Error(`${operation} failed. Please try again later.`);
    }
  }
  return error instanceof Error ? error : new Error("An unknown error occurred");
}

export async function fetchWorkflowDetails(workflowId: string, orgId: string): Promise<WorkflowDetails> {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}?org_id=${orgId}`);
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Fetching workflow details");
  }
}

export async function toggleWorkflowStatus(
  workflowId: string,
  orgId: string,
  active: boolean,
): Promise<WorkflowDetails> {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify({ active, org_id: orgId }),
    });
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Toggling workflow status");
  }
}

export async function fetchUserInfo(): Promise<UserInfo> {
  try {
    const response = await fetchWithAuth(`${API_ENDPOINT}/users/me`);
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Fetching user info");
  }
}

export async function fetchWorkflowErrors(workflowId: string, orgId: string): Promise<WorkflowErrorResponse> {
  try {
    const response = await fetchWithAuth(
      `${API_ENDPOINT}/workflows/${workflowId}/$errors/event_summaries?expand=event&limit=100&org_id=${orgId}`,
    );
    return response.json();
  } catch (error) {
    throw handleAPIError(error, "Fetching workflow errors");
  }
}
