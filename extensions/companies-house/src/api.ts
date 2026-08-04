import { getPreferenceValues } from "@raycast/api";

import { API_BASE, PAGE_SIZE } from "./constants";
import type {
  AppointmentsResponse,
  ChargesResponse,
  CompanyOfficersResponse,
  CompanyProfile,
  CompanySearchResponse,
  FilingHistoryResponse,
  OfficerSearchResponse,
  PscResponse,
} from "./types";

type QueryParams = Record<string, string | number | undefined>;

/** Turns an HTTP status into a clear, actionable message. */
function messageForStatus(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "Invalid or unauthorised API key. Check it in the extension preferences.";
    case 404:
      return "Not found.";
    case 429:
      return "Rate limit reached (600 requests per 5 minutes). Please wait a moment and try again.";
    default:
      if (status >= 500) {
        return "Companies House is currently unavailable. Please try again later.";
      }
      return `Request failed (${status}).`;
  }
}

/**
 * Performs an authenticated GET against the Companies House API.
 *
 * Authentication is HTTP Basic with the API key as the username and an empty
 * password, so the header is `Basic base64("<key>:")`.
 */
async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new NotOkError(response.status);
  }

  return (await response.json()) as T;
}

/** Carries the HTTP status so callers can tell an absence from a failure. */
class NotOkError extends Error {
  constructor(readonly status: number) {
    super(messageForStatus(status));
    this.name = "NotOkError";
  }
}

/**
 * For sub-resources a company may legitimately not have.
 *
 * Companies House answers "this company has no charges" and "this company has
 * no insolvency history" with a 404, the same status it uses for a company
 * number that does not exist. Treating that as an error shows a failure toast
 * to someone whose only crime was looking up a company with a clean record, so
 * these endpoints resolve to `undefined` instead and let the view say "none".
 */
async function requestOptional<T>(
  path: string,
  params?: QueryParams,
): Promise<T | undefined> {
  try {
    return await request<T>(path, params);
  } catch (error) {
    if (error instanceof NotOkError && error.status === 404) return undefined;
    throw error;
  }
}

export function searchCompanies(query: string, startIndex: number) {
  return request<CompanySearchResponse>("/search/companies", {
    q: query,
    items_per_page: PAGE_SIZE,
    start_index: startIndex,
  });
}

export function searchOfficers(query: string, startIndex: number) {
  return request<OfficerSearchResponse>("/search/officers", {
    q: query,
    items_per_page: PAGE_SIZE,
    start_index: startIndex,
  });
}

export function getCompany(companyNumber: string) {
  return request<CompanyProfile>(
    `/company/${encodeURIComponent(companyNumber)}`,
  );
}

export function getCompanyOfficers(companyNumber: string, startIndex: number) {
  return request<CompanyOfficersResponse>(
    `/company/${encodeURIComponent(companyNumber)}/officers`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getOfficerAppointments(officerId: string, startIndex: number) {
  return request<AppointmentsResponse>(
    `/officers/${encodeURIComponent(officerId)}/appointments`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getFilingHistory(companyNumber: string, startIndex: number) {
  return request<FilingHistoryResponse>(
    `/company/${encodeURIComponent(companyNumber)}/filing-history`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

/**
 * A company with no charges 404s rather than returning an empty list, so this
 * resolves to `undefined` in that case rather than throwing.
 */
export function getCharges(companyNumber: string, startIndex: number) {
  return requestOptional<ChargesResponse>(
    `/company/${encodeURIComponent(companyNumber)}/charges`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}

export function getPersonsWithSignificantControl(
  companyNumber: string,
  startIndex: number,
) {
  return request<PscResponse>(
    `/company/${encodeURIComponent(companyNumber)}/persons-with-significant-control`,
    {
      items_per_page: PAGE_SIZE,
      start_index: startIndex,
    },
  );
}
