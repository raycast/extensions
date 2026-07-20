import { Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { getKobbePreferences } from "./preferences";
import type {
  KobbeRevenue,
  KobbeSite,
  OverviewResponse,
  RevenueResponse,
  SitesResponse,
  TimeRange,
  TopPagesResponse,
} from "./types";

type ApiErrorBody = {
  ok?: false;
  error?: string;
  required?: string;
};

export class KobbeApiError extends Error {
  status: number;
  requiredScope?: string;

  constructor(message: string, status: number, requiredScope?: string) {
    super(message);
    this.name = "KobbeApiError";
    this.status = status;
    this.requiredScope = requiredScope;
  }
}

export type Loadable<T> = {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  revalidate: () => void;
};

function errorMessageFromBody(body: ApiErrorBody, status: number): string {
  if (status === 401) {
    return "Kobbe rejected the API token.";
  }
  if (status === 403 && body.required) {
    return `API token is missing the ${body.required} scope.`;
  }
  if (body.error) {
    return body.error.replace(/_/g, " ");
  }
  return `Kobbe API request failed (${status}).`;
}

async function kobbeFetch<T>(path: string, searchParams?: Record<string, string | number | undefined>): Promise<T> {
  const preferences = getKobbePreferences();

  if (!preferences.apiToken) {
    throw new KobbeApiError("Add your Kobbe API token in extension preferences.", 401);
  }
  const url = new URL(path, preferences.baseUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value != null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${preferences.apiToken}`,
      Accept: "application/json",
    },
  });

  const body = (await response.json().catch(() => ({}))) as T | ApiErrorBody;

  const isErrorBody = typeof body === "object" && body !== null && "ok" in body && body.ok === false;

  if (!response.ok || isErrorBody) {
    const errorBody = body as ApiErrorBody;
    throw new KobbeApiError(errorMessageFromBody(errorBody, response.status), response.status, errorBody.required);
  }

  return body as T;
}

export function useKobbeQuery<T>(load: () => Promise<T>, deps: readonly unknown[] = []): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const revalidate = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await load();
        if (!cancelled) {
          setData(result);
        }
      } catch (cause) {
        const nextError = cause instanceof Error ? cause : new Error("Could not load Kobbe data.");
        if (!cancelled) {
          setError(nextError);
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load Kobbe data",
            message: nextError.message,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, ...deps]);

  return { data, error, isLoading, revalidate };
}

export async function listSites(): Promise<KobbeSite[]> {
  const response = await kobbeFetch<SitesResponse>("/api/agent/sites");
  return response.sites;
}

export async function getOverview(siteId: string, range: TimeRange): Promise<OverviewResponse> {
  return kobbeFetch<OverviewResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/overview`, { range });
}

export async function getTopPages(siteId: string, range: TimeRange, limit = 10): Promise<TopPagesResponse> {
  return kobbeFetch<TopPagesResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/top-pages`, { range, limit });
}

export async function getRevenue(siteId: string, range: TimeRange): Promise<RevenueResponse> {
  return kobbeFetch<RevenueResponse>(`/api/agent/sites/${encodeURIComponent(siteId)}/revenue`, { range });
}

export function dashboardUrl(siteId: string, range?: TimeRange): string {
  const preferences = getKobbePreferences();
  const url = new URL(`/s/${encodeURIComponent(siteId)}`, preferences.baseUrl);
  if (range) {
    url.searchParams.set("range", range);
  }
  return url.toString();
}

export function formatRevenue(revenue: KobbeRevenue): string {
  if (revenue.orders <= 0 || revenue.amount <= 0) {
    return "No revenue";
  }
  return formatRevenueAmount(revenue.amount, revenue.currency, revenue.multipleCurrencies);
}

export function formatRevenueAmount(amount: number, currency: string | null, multipleCurrencies = false): string {
  if (multipleCurrencies || !currency) {
    return "Multiple currencies";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}
