import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import type { ApiConfig, DataApiResponse, DataPoint, UserApiResponse, UserData } from "./types";

export const QUOTA_TO_USD = 500_000;
const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;

interface Preferences {
  refreshInterval: string;
}

export type ApiQueryState = "invalid" | "loading" | "refreshing" | "ready" | "partial" | "error";

export interface ApiStatusSnapshot {
  state: ApiQueryState;
  statusText: string;
  statusDetail?: string;
  balanceUsd: number | null;
  totalUsedUsd: number | null;
  todayUsageUsd: number | null;
  requestCount: number | null;
  plan: string | null;
  userData: UserData | null;
  dataFetchFailed: boolean;
  isLoading: boolean;
  safeUrl: string | null;
  refresh: () => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRefreshIntervalMinutes(value: string): number {
  const minutes = Number.parseInt(value, 10);
  return [1, 3, 5, 10, 30].includes(minutes) ? minutes : DEFAULT_REFRESH_INTERVAL_MINUTES;
}

export function getRefreshIntervalMs(): number {
  const preferences = getPreferenceValues<Preferences>();
  return normalizeRefreshIntervalMinutes(preferences.refreshInterval) * 60_000;
}

function isUserData(value: unknown): value is UserData {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "number" &&
    typeof value.username === "string" &&
    typeof value.quota === "number" &&
    typeof value.used_quota === "number" &&
    typeof value.request_count === "number" &&
    (value.display_name === undefined || typeof value.display_name === "string") &&
    (value.group === undefined || typeof value.group === "string")
  );
}

function isUserApiResponse(value: unknown): value is UserApiResponse {
  if (!isRecord(value) || typeof value.success !== "boolean") return false;
  if (value.message !== undefined && typeof value.message !== "string") return false;
  if (value.data !== undefined && !isUserData(value.data)) return false;
  return true;
}

function isDataPoint(value: unknown): value is DataPoint {
  return isRecord(value) && typeof value.quota === "number";
}

function isDataApiResponse(value: unknown): value is DataApiResponse {
  if (!isRecord(value) || typeof value.success !== "boolean") return false;
  if (value.message !== undefined && typeof value.message !== "string") return false;
  if (value.data !== undefined) {
    if (!Array.isArray(value.data)) return false;
    if (!value.data.every(isDataPoint)) return false;
  }
  return true;
}

function authHeaders(config: ApiConfig): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    "New-Api-User": config.userId,
  };
}

export function usePollingRefreshToken(intervalMs: number): number {
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshToken((value) => value + 1);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return refreshToken;
}

export function todayTimestamps(): { start: number; end: number } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: Math.floor(startOfDay.getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
}

export function sumTodayUsage(data: DataApiResponse | undefined): number | null {
  if (!data?.data || data.data.length === 0) return null;

  let total = 0;
  for (const point of data.data) {
    const quota = point.quota;
    if (!Number.isFinite(quota)) continue;
    total += quota;
  }

  return total / QUOTA_TO_USD;
}

export function apiUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
}

export function validateStoredUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function useApiStatus(config: ApiConfig, refreshToken = 0): ApiStatusSnapshot {
  const safeUrl = validateStoredUrl(config.baseUrl);
  const urlError = safeUrl === null;
  const { start, end } = useMemo(() => todayTimestamps(), [refreshToken]);

  // Polling keeps the last successful snapshot visible between refreshes.
  // The rest of this extension still defaults to keepPreviousData: false.
  const userFetch = useFetch<unknown>(urlError ? "" : apiUrl(safeUrl, "/api/user/self"), {
    headers: urlError ? undefined : authHeaders(config),
    keepPreviousData: true,
    execute: !urlError,
  });

  const dataFetch = useFetch<unknown>(
    urlError ? "" : apiUrl(safeUrl, `/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`),
    {
      headers: urlError ? undefined : authHeaders(config),
      keepPreviousData: true,
      execute: !urlError,
    },
  );

  useEffect(() => {
    if (urlError || refreshToken <= 0) return;
    void Promise.all([userFetch.revalidate(), dataFetch.revalidate()]);
  }, [refreshToken, urlError, userFetch.revalidate, dataFetch.revalidate]);

  const userResponse = isUserApiResponse(userFetch.data) ? userFetch.data : null;
  const rawDataResponse = dataFetch.data;
  const dataResponse = isDataApiResponse(rawDataResponse) ? rawDataResponse : undefined;
  const userData = userResponse?.data ?? null;
  const balanceUsd = userData ? userData.quota / QUOTA_TO_USD : null;
  const totalUsedUsd = userData ? userData.used_quota / QUOTA_TO_USD : null;
  const isLoading = urlError ? false : userFetch.isLoading || dataFetch.isLoading;
  const dataFetchFailed = Boolean(dataFetch.error);
  const refresh = async () => {
    if (urlError) return;
    await Promise.all([userFetch.revalidate(), dataFetch.revalidate()]);
  };

  if (urlError) {
    return {
      state: "invalid",
      statusText: "Invalid URL",
      statusDetail: "Re-save this station with a valid https:// URL.",
      balanceUsd: null,
      totalUsedUsd: null,
      todayUsageUsd: null,
      requestCount: null,
      plan: null,
      userData: null,
      dataFetchFailed: false,
      isLoading: false,
      safeUrl: null,
      refresh,
    };
  }

  if (userFetch.error) {
    return {
      state: "error",
      statusText: "Query failed",
      statusDetail: userFetch.error.message,
      balanceUsd: null,
      totalUsedUsd: null,
      todayUsageUsd: null,
      requestCount: null,
      plan: null,
      userData: null,
      dataFetchFailed,
      isLoading: false,
      safeUrl,
      refresh,
    };
  }

  if (!userFetch.isLoading && !userResponse) {
    return {
      state: "error",
      statusText: "Bad response",
      statusDetail: "The account endpoint returned an unexpected payload.",
      balanceUsd: null,
      totalUsedUsd: null,
      todayUsageUsd: null,
      requestCount: null,
      plan: null,
      userData: null,
      dataFetchFailed,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  if (userResponse && (!userResponse.success || !userData)) {
    return {
      state: "error",
      statusText: "API rejected",
      statusDetail: userResponse.message ?? "Failed to load account data.",
      balanceUsd: null,
      totalUsedUsd: null,
      todayUsageUsd: null,
      requestCount: null,
      plan: null,
      userData: null,
      dataFetchFailed,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  if (!userData) {
    return {
      state: "loading",
      statusText: "Querying",
      statusDetail: "Loading account status...",
      balanceUsd: null,
      totalUsedUsd: null,
      todayUsageUsd: null,
      requestCount: null,
      plan: null,
      userData: null,
      dataFetchFailed,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  if (!dataFetch.isLoading && rawDataResponse !== undefined && !dataResponse) {
    return {
      state: "partial",
      statusText: "Bad usage data",
      statusDetail: "The usage endpoint returned an unexpected payload.",
      balanceUsd,
      totalUsedUsd,
      todayUsageUsd: null,
      requestCount: userData.request_count,
      plan: userData.group ?? "default",
      userData,
      dataFetchFailed: false,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  if (dataFetchFailed) {
    return {
      state: "partial",
      statusText: "Usage failed",
      statusDetail: dataFetch.error?.message ?? "Failed to load today's usage.",
      balanceUsd,
      totalUsedUsd,
      todayUsageUsd: null,
      requestCount: userData.request_count,
      plan: userData.group ?? "default",
      userData,
      dataFetchFailed: true,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  const todayUsageUsd = sumTodayUsage(dataResponse);

  if (isLoading) {
    return {
      state: "refreshing",
      statusText: "Refreshing",
      statusDetail: "Updating account status...",
      balanceUsd,
      totalUsedUsd,
      todayUsageUsd,
      requestCount: userData.request_count,
      plan: userData.group ?? "default",
      userData,
      dataFetchFailed: false,
      isLoading,
      safeUrl,
      refresh,
    };
  }

  return {
    state: "ready",
    statusText: "Up to date",
    statusDetail: "Latest account status loaded.",
    balanceUsd,
    totalUsedUsd,
    todayUsageUsd,
    requestCount: userData.request_count,
    plan: userData.group ?? "default",
    userData,
    dataFetchFailed: false,
    isLoading: false,
    safeUrl,
    refresh,
  };
}
