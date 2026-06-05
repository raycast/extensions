import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  BreakdownKind,
  BreakdownRow,
  DateRangeKey,
  Metadata,
  Overview,
  Realtime,
  VisitorDetail,
  VisitorListRow,
} from "./types";

const API_BASE_URL = "https://datafa.st/api/v1";

export class DataFastError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "DataFastError";
  }
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getDateRange(range: DateRangeKey): { startAt?: string; endAt?: string; label: string } {
  if (range === "all") {
    return { label: "All time" };
  }

  const days = Number.parseInt(range, 10);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);

  return {
    startAt: toDateInput(start),
    endAt: toDateInput(end),
    label: `Last ${days} days`,
  };
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function commonSearchParams(
  options: {
    range?: DateRangeKey;
    limit?: number;
    offset?: number;
    extra?: Record<string, string | number | boolean | undefined>;
  } = {},
): URLSearchParams {
  const preferences = getPreferences();
  const params = new URLSearchParams();
  const dateRange = getDateRange(options.range ?? preferences.defaultDateRange);

  if (preferences.websiteId && preferences.apiKey.startsWith("dft_")) {
    params.set("websiteId", preferences.websiteId);
  }

  if (preferences.timezone) {
    params.set("timezone", preferences.timezone);
  }

  if (dateRange.startAt && dateRange.endAt) {
    params.set("startAt", dateRange.startAt);
    params.set("endAt", dateRange.endAt);
  }

  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  if (options.offset) {
    params.set("offset", String(options.offset));
  }

  for (const [key, value] of Object.entries(options.extra ?? {})) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  return params;
}

export async function requestDataFast<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    params?: URLSearchParams;
    body?: unknown;
  } = {},
): Promise<T> {
  const preferences = getPreferences();

  if (!preferences.apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "DataFast API key is missing",
      message: "Open extension preferences to add one.",
      primaryAction: {
        title: "Open Preferences",
        onAction: openExtensionPreferences,
      },
    });
    throw new DataFastError("DataFast API key is missing");
  }

  const url = new URL(`${API_BASE_URL}${path}`);
  options.params?.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const json = parseJson<ApiEnvelope<T> | ApiErrorEnvelope>(text);

  if (!response.ok) {
    throw new DataFastError(getApiErrorMessage(json) ?? response.statusText, response.status);
  }

  if (!json || !("status" in json) || json.status !== "success") {
    throw new DataFastError("DataFast returned an unexpected response.");
  }

  return (json as ApiEnvelope<T>).data;
}

export async function getMetadata(): Promise<Metadata> {
  const data = await requestDataFast<Metadata[]>("/analytics/metadata", {
    params: commonSearchParams(),
  });
  return data[0] ?? {};
}

export async function getOverview(range?: DateRangeKey): Promise<Overview> {
  const data = await requestDataFast<Overview[]>("/analytics/overview", {
    params: commonSearchParams({ range }),
  });
  return data[0] ?? {};
}

export async function getRealtime(): Promise<Realtime> {
  const data = await requestDataFast<Realtime[]>("/analytics/realtime", {
    params: commonSearchParams(),
  });
  return data[0] ?? {};
}

export async function getBreakdown(kind: BreakdownKind, range?: DateRangeKey): Promise<BreakdownRow[]> {
  const endpoint = kind === "goals" ? "/analytics/goals" : `/analytics/${kind}`;
  return requestDataFast<BreakdownRow[]>(endpoint, {
    params: commonSearchParams({ range, limit: 20 }),
  });
}

export async function listVisitors(filters: Record<string, string | boolean | undefined>): Promise<VisitorListRow[]> {
  return requestDataFast<VisitorListRow[]>("/visitors", {
    params: commonSearchParams({ limit: 50, extra: filters }),
  });
}

export async function getVisitor(visitorId: string): Promise<VisitorDetail> {
  const params = commonSearchParams({ range: "all" });
  params.delete("startAt");
  params.delete("endAt");
  params.delete("timezone");

  return requestDataFast<VisitorDetail>(`/visitors/${encodeURIComponent(visitorId)}`, { params });
}

export async function createGoal(values: {
  visitorId: string;
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<{ message?: string; eventId?: string }[]> {
  const params = commonSearchParams({ range: "all" });
  params.delete("startAt");
  params.delete("endAt");
  params.delete("timezone");

  return requestDataFast<{ message?: string; eventId?: string }[]>("/goals", {
    method: "POST",
    params,
    body: {
      datafast_visitor_id: values.visitorId,
      name: values.name,
      description: values.description || undefined,
      metadata: values.metadata && Object.keys(values.metadata).length > 0 ? values.metadata : undefined,
    },
  });
}

function parseJson<T>(text: string): T | undefined {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function getApiErrorMessage(error: ApiErrorEnvelope | ApiEnvelope<unknown> | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  if ("error" in error && typeof error.error === "string") {
    return error.error;
  }

  return undefined;
}
