import {
  Activity,
  ActivityResponse,
  BatchDeleteResponse,
  CreateActivityInput,
  DeleteResponse,
  HealthMetricsResponse,
  ListActivitiesParams,
  ListActivitiesResponse,
  PairResponse,
  TrainingStatus,
  UnpairResponse,
} from "./types";
import { authorize, resetAuthorization } from "./oauth";

const BASE_URL = "https://shapecalendar.com/api/v1";
const REQUEST_TIMEOUT_MS = 30_000;

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const token = await authorize();
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token was revoked (e.g. from Shape settings) — sign in again.
      await resetAuthorization(token);
      if (retryOnUnauthorized) return request<T>(path, options, false);
      throw new Error("Could not sign in to Shape Calendar. Please try again.");
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
  if (params.includePaired) searchParams.set("includePaired", "true");

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

export async function pairActivities(
  completedActivityId: string,
  plannedActivityId: string,
): Promise<PairResponse> {
  return request<PairResponse>("/activities/pair", {
    method: "POST",
    body: JSON.stringify({ completedActivityId, plannedActivityId }),
  });
}

export async function unpairActivity(
  activityId: string,
): Promise<UnpairResponse> {
  return request<UnpairResponse>("/activities/unpair", {
    method: "POST",
    body: JSON.stringify({ activityId }),
  });
}

export type ActivityDetailsParams = {
  channels?: string[];
  points?: number;
  includeLaps?: boolean;
  includeZones?: boolean;
};

export async function getActivityDetails(
  id: string,
  params: ActivityDetailsParams = {},
): Promise<Record<string, unknown>> {
  const searchParams = new URLSearchParams();
  if (params.channels?.length) {
    searchParams.set("channels", params.channels.join(","));
  }
  if (params.points) searchParams.set("points", String(params.points));
  if (params.includeLaps === false) searchParams.set("includeLaps", "false");
  if (params.includeZones === false) searchParams.set("includeZones", "false");

  const query = searchParams.toString();
  return request<Record<string, unknown>>(
    `/activities/${id}/details${query ? `?${query}` : ""}`,
  );
}

export type HealthMetricsParams = {
  from?: string;
  to?: string;
  source?: "garmin" | "apple";
  metrics?: string[];
};

export async function getHealthMetrics(
  params: HealthMetricsParams = {},
): Promise<HealthMetricsResponse> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.source) searchParams.set("source", params.source);
  if (params.metrics?.length) {
    searchParams.set("metrics", params.metrics.join(","));
  }

  const query = searchParams.toString();
  return request<HealthMetricsResponse>(
    `/health-metrics${query ? `?${query}` : ""}`,
  );
}

export async function getTrainingStatus(
  params: { from?: string; to?: string } = {},
): Promise<TrainingStatus> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  const query = searchParams.toString();
  return request<TrainingStatus>(`/training-status${query ? `?${query}` : ""}`);
}
