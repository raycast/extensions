import { getPreferenceValues } from "@raycast/api";
import {
  Activity,
  ActivityResponse,
  BatchDeleteResponse,
  CreateActivityInput,
  DeleteResponse,
  ListActivitiesParams,
  ListActivitiesResponse,
} from "./types";

const BASE_URL = "https://shapecalendar.com/api/v1";

function getToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  return apiToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Invalid API token. Check your Shape Calendar API token in extension preferences.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    }
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error || `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getActivities(
  params: ListActivitiesParams = {},
): Promise<ListActivitiesResponse> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.sportType) searchParams.set("sportType", params.sportType);
  if (params.completed) searchParams.set("completed", params.completed);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  return request<ListActivitiesResponse>(
    `/activities${query ? `?${query}` : ""}`,
  );
}

export async function getActivity(id: string): Promise<Activity> {
  const res = await request<ActivityResponse>(`/activities/${id}`);
  return res.activity;
}

export async function createActivity(
  input: CreateActivityInput,
): Promise<Activity> {
  const res = await request<ActivityResponse>("/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.activity;
}

export async function updateActivity(
  id: string,
  input: Partial<CreateActivityInput>,
): Promise<Activity> {
  const res = await request<ActivityResponse>(`/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.activity;
}

export async function deleteActivity(id: string): Promise<DeleteResponse> {
  return request<DeleteResponse>(`/activities/${id}`, { method: "DELETE" });
}

export async function batchUpdateActivities(
  activities: (Partial<CreateActivityInput> & { id: string })[],
): Promise<{ updated: number }> {
  return request<{ updated: number }>("/activities/batch", {
    method: "PATCH",
    body: JSON.stringify({ activities }),
  });
}

export async function batchCreateActivities(
  activities: CreateActivityInput[],
): Promise<Activity[]> {
  const res = await request<{ activities: Activity[] }>("/activities/batch", {
    method: "POST",
    body: JSON.stringify({ activities }),
  });
  return res.activities;
}

export async function batchDeleteActivities(
  ids: string[],
): Promise<BatchDeleteResponse> {
  return request<BatchDeleteResponse>("/activities/batch", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
