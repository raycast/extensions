import { getPreferenceValues } from "@raycast/api";
import { Preferences, ApiResponse, Worklog } from "./types";

const BASE_URL = "https://api.clockwork.report/v1";

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { apiToken } = getPreferenceValues<Preferences>();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Token ${apiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("Invalid API token. Check your Clockwork API token in Raycast preferences.");
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = (await response.json()) as { message?: string; error?: string };
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export async function startTimer(issueKey: string): Promise<ApiResponse> {
  return apiRequest<ApiResponse>("/start_timer", {
    method: "POST",
    body: JSON.stringify({ issue_key: issueKey }),
  });
}

export async function stopTimer(issueKey: string): Promise<ApiResponse> {
  return apiRequest<ApiResponse>("/stop_timer", {
    method: "POST",
    body: JSON.stringify({ issue_key: issueKey }),
  });
}

export interface WorklogsApiResponse {
  worklogs?: Worklog[];
  issues?: Record<string, { key: string; summary: string; fields?: { summary?: string } }>;
  [key: string]: unknown;
}

export async function getWorklogs(startDate: string, endDate: string): Promise<Worklog[]> {
  const { accountId } = getPreferenceValues<Preferences>();

  const params = new URLSearchParams({
    starting_at: startDate,
    ending_at: endDate,
    expand: "issues,authors,worklogs",
  });

  if (accountId) {
    params.set("account_id", accountId);
  }

  const response = await apiRequest<WorklogsApiResponse>(`/worklogs?${params.toString()}`);

  // API returns plain array
  let worklogs: Worklog[] = [];
  if (Array.isArray(response)) {
    worklogs = response as unknown as Worklog[];
  } else if (response.worklogs) {
    worklogs = response.worklogs;
  }

  return worklogs.map((w) => {
    const raw = w as unknown as Record<string, unknown>;
    const issue = raw.issue as
      | {
          key?: string;
          fields?: {
            summary?: string;
            status?: { name?: string };
          };
        }
      | undefined;

    return {
      id: String(w.id || Math.random()),
      issueId: String(w.issueId),
      issueKey: issue?.key || w.issueKey || String(w.issueId),
      issueSummary: issue?.fields?.summary || w.issueSummary || "",
      issueStatus: issue?.fields?.status?.name || "",
      timeSpentSeconds: w.timeSpentSeconds || 0,
      started: w.started || "",
    };
  });
}
