import fetch, { RequestInit, Response } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { WorkflowErrorResponse, Preferences, UserInfo, WorkflowDetails } from "../types";
import { API_ENDPOINT } from "../utils/constants";

const preferences = getPreferenceValues<Preferences>();

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${preferences.PIPEDREAM_API_KEY}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error: ${response.status} ${response.statusText}\nBody: ${errorBody}`);
  }

  return response;
}

export async function fetchWorkflowDetails(workflowId: string, orgId: string): Promise<WorkflowDetails> {
  const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}?org_id=${orgId}`);
  return response.json();
}

export async function toggleWorkflowStatus(
  workflowId: string,
  orgId: string,
  active: boolean,
): Promise<WorkflowDetails> {
  const response = await fetchWithAuth(`${API_ENDPOINT}/workflows/${workflowId}`, {
    method: "PUT",
    body: JSON.stringify({
      active,
      org_id: orgId,
    }),
  });
  return response.json();
}

export async function fetchUserInfo(): Promise<UserInfo> {
  const response = await fetchWithAuth(`${API_ENDPOINT}/users/me`);
  return response.json();
}

export async function fetchWorkflowErrors(workflowId: string, orgId: string): Promise<WorkflowErrorResponse> {
  const response = await fetchWithAuth(
    `${API_ENDPOINT}/workflows/${workflowId}/$errors/event_summaries?expand=event&limit=100&org_id=${orgId}`,
  );
  return response.json();
}
