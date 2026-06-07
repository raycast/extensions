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
    throw new Error(messageForStatus(response.status));
  }

  return (await response.json()) as T;
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

export function getCharges(companyNumber: string) {
  return request<ChargesResponse>(
    `/company/${encodeURIComponent(companyNumber)}/charges`,
  );
}
