/**
 * Typed wrapper around @raycast/utils' `useFetch` for Codeforces API calls.
 */

import { showFailureToast, useFetch } from "@raycast/utils";
import { useMemo, useEffect } from "react";
import { CODEFORCES_API_BASE } from "../constants";
import type { ApiResponse } from "../types/codeforces";

export type QueryParams = Record<string, string | number | boolean | Array<string | number>>;

/**
 * Build a Codeforces-style query string from params.
 * - Arrays are joined with ';'
 * - Booleans become 'true'/'false'
 * - Values are URI-encoded
 */
export function buildQueryParams(params?: QueryParams): string {
  if (!params) return "";
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const joined = value.map((v) => String(v)).join(";");
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(joined)}`);
    } else if (typeof value === "boolean") {
      parts.push(`${encodeURIComponent(key)}=${value ? "true" : "false"}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Runtime type guard for ApiResponse<T>.
 * We check the presence and shape of `status` (string) and allow optional `result`/`comment`.
 */
function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== "object") return false;
  // 'status' is required by Codeforces API response shape
  const obj = value as Record<string, unknown>;
  return "status" in obj && typeof obj.status === "string";
}

/**
 * useCodeforces hook
 * - methodPath: e.g. "user.info", "contest.status"
 * - params: query params encoded using Codeforces conventions
 */
export function useCodeforces<T>(methodPath: string, params?: QueryParams) {
  const query = useMemo(() => buildQueryParams(params), [params]);
  const url = useMemo(() => `${CODEFORCES_API_BASE}${methodPath}${query}`, [methodPath, query]);

  // Use generic to type data as ApiResponse<T> | undefined
  const { isLoading, data, error, revalidate } = useFetch<ApiResponse<T>>(url, { keepPreviousData: true });

  // Network / fetch errors -> toast + console
  useEffect(() => {
    if (!error) return;
    try {
      console.error(`[useCodeforces] network error for ${url}`, error);
    } catch {
      /* ignore */
    }

    try {
      void showFailureToast(error, { title: "Network Error" });
    } catch {
      /* ignore toast errors */
    }
  }, [error, url]);

  // API-level errors (status !== "OK") -> toast + console
  useEffect(() => {
    // If still loading or no data, nothing to do.
    if (isLoading || data === undefined) return;

    // Guard the shape of `data` at runtime.
    if (!isApiResponse<T>(data)) {
      // If data is unexpected, log and surface a toast to help debugging.
      try {
        console.error(`[useCodeforces] unexpected response shape for ${url}`, data);
        void showFailureToast("Unexpected response shape", { title: "Codeforces API Error" });
      } catch {
        /* ignore toast errors */
      }
      return;
    }

    if (data.status !== "OK") {
      try {
        console.error(`[useCodeforces] API FAILED: ${url} comment=${data.comment ?? ""}`);
      } catch {
        /* ignore */
      }

      try {
        const message = data.comment ?? `status=${data.status}`;
        void showFailureToast(message, { title: "Codeforces API Error" });
      } catch {
        /* ignore toast errors */
      }
    }
  }, [isLoading, data, url]);

  return {
    isLoading,
    error,
    // If `data` conforms to ApiResponse<T>, return its result; otherwise undefined.
    result: isApiResponse<T>(data) ? data.result : undefined,
    raw: isApiResponse<T>(data) ? data : undefined,
    url,
    revalidate,
  };
}
