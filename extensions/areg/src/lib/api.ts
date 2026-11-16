import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { AREG_URL } from "./constants";
import type { CompanyResponse, CompanySummary, SearchResponse } from "./types";

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
}

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${AREG_URL}${path}`, {
    headers: { Accept: "application/json", "User-Agent": "areg-raycast" },
    signal,
  });
  if (response.status === 404) throw new NotFoundError(path);
  if (!response.ok) throw new Error(`areg.no responded ${response.status} for ${path}`);
  return (await response.json()) as T;
}

export async function searchCompanies(query: string, signal?: AbortSignal): Promise<CompanySummary[]> {
  // A `type:company` filter would turn off prefix matching on the last word, so filter here instead.
  const params = new URLSearchParams({ q: query, limit: "50" });
  const response = await fetch(`${AREG_URL}/?${params}`, {
    headers: { Accept: "application/json", "User-Agent": "areg-raycast" },
    signal,
  });
  if (!response.ok) throw new Error(`areg.no responded ${response.status}`);
  const body = (await response.json()) as SearchResponse | CompanyResponse;
  // An org number query redirects to the company itself.
  if (!("hits" in body)) {
    return [{ orgnr: body.orgnr, name: body.name, form: body.orgForm, city: body.data?.forretningsadresse?.poststed }];
  }
  return body.hits
    .filter((hit) => hit.kind === "company" && hit.orgnr)
    .map((hit) => ({ orgnr: hit.orgnr as string, name: hit.name, form: hit.form, city: hit.city }));
}

/** Fetches an areg resource with caching, so moving back and forth between views is instant. */
export function useAreg<T>(path: string | undefined) {
  return useCachedPromise((p: string) => fetchJson<T>(p), [path ?? ""], {
    execute: Boolean(path),
    keepPreviousData: false,
    // Views render their own empty state for a missing resource, so only real failures get a toast.
    onError: (error) => {
      if (!(error instanceof NotFoundError) && error.name !== "AbortError") {
        void showFailureToast(error, { title: "Couldn't reach areg.no" });
      }
    },
  });
}

export function isNotFound(error: unknown): boolean {
  return error instanceof NotFoundError;
}
