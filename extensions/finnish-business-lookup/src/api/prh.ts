import { PRH_API_BASE_URL } from "../constants";
import type { PrhCompanyResult, PrhErrorResponse } from "../types/prh";

export interface SearchCompaniesParams {
  name?: string;
  businessId?: string;
  page?: number;
}

const inFlightRequests = new Map<string, Promise<PrhCompanyResult>>();

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const maybeError = payload as PrhErrorResponse;
  return maybeError.message || maybeError.errorcode || maybeError.code;
}

function buildQueryString(params: SearchCompaniesParams): string {
  const query = new URLSearchParams();

  if (params.name) {
    query.set("name", params.name);
  }

  if (params.businessId) {
    query.set("businessId", params.businessId);
  }

  query.set("page", String(params.page ?? 1));

  return query.toString();
}

function createAbortError(): Error {
  return new DOMException("The operation was aborted.", "AbortError");
}

async function withCallerAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw createAbortError();
  }

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
  });
}

function fetchCompanies(url: string): Promise<PrhCompanyResult> {
  const inFlight = inFlightRequests.get(url);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let detail = "";
      try {
        const payload = (await response.json()) as unknown;
        detail = getErrorMessage(payload) ?? "";
      } catch {
        detail = "";
      }

      const suffix = detail ? `: ${detail}` : "";
      throw new Error(`PRH request failed (${response.status})${suffix}`);
    }

    return (await response.json()) as PrhCompanyResult;
  })().finally(() => {
    inFlightRequests.delete(url);
  });

  inFlightRequests.set(url, request);
  return request;
}

export async function searchCompanies(params: SearchCompaniesParams, signal?: AbortSignal): Promise<PrhCompanyResult> {
  const queryString = buildQueryString(params);
  const url = `${PRH_API_BASE_URL}/companies?${queryString}`;

  return await withCallerAbort(fetchCompanies(url), signal);
}

export function getRawCompanyApiUrl(businessId: string): string {
  const encoded = encodeURIComponent(businessId);
  return `${PRH_API_BASE_URL}/companies?businessId=${encoded}`;
}
