import { getPreferenceValues } from "@raycast/api";
import { API_BASE_URL } from "../config";
import type { FundingEvent, JobHistory } from "../types";

export interface EnrichPersonResponse {
  error?: boolean;
  error_code?: string;
  message?: string;
  balance: number;
  person?: {
    first_name: string;
    last_name: string;
    full_name: string;
    headline?: string;
    linkedin_url?: string;
    current_job_title?: string;
    job_history?: JobHistory[];
    mobile?: {
      status: string;
      mobile_international?: string;
      mobile_country?: string;
    };
    email?: {
      status: string;
      email: string;
      email_mx_provider?: string;
    };
    location?: {
      country: string;
      city: string;
      state?: string;
      country_code?: string;
    };
  };
  company?: {
    name?: string;
    website?: string;
    domain?: string;
    type?: string;
    industry?: string;
    description_ai?: string;
    employee_range?: string;
    employee_count?: number;
    founded?: number;
    linkedin_url?: string;
    twitter_url?: string;
    logo_url?: string;
    location?: {
      country: string;
      city: string;
      raw_address?: string;
    };
    revenue_range_printed?: string;
    funding?: {
      total_funding_printed: string;
      latest_funding_stage: string;
      latest_funding_date: string;
      funding_events?: FundingEvent[];
    };
    keywords?: string[];
  };
}

interface SearchPersonJob {
  title: string;
  company_name: string;
  current: boolean;
  seniority?: string;
  departments?: string[];
}

interface SearchPersonResult {
  person_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  headline?: string;
  linkedin_url?: string;
  current_job_title?: string;
  job_history?: SearchPersonJob[];
  location?: {
    country: string;
    city: string;
  };
}

export interface SearchPersonResponse {
  error?: boolean;
  error_code?: string;
  message?: string;
  balance: number;
  results?: Array<{ person: SearchPersonResult }>;
  pagination?: {
    current_page: number;
    per_page: number;
    total_page: number;
    total_count: number;
    page?: number;
    total_pages?: number;
    total_results?: number;
  };
}

interface CreditsResponse {
  balance: number;
}

interface InsufficientCreditsError {
  error: true;
  error_code: "INSUFFICIENT_CREDITS";
  message: string;
  balance: number;
}

export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey?.trim()) {
    throw new Error("API key not configured");
  }
  return apiKey.trim();
}

function isInsufficientCreditsError(data: unknown): data is InsufficientCreditsError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error_code" in data &&
    (data as InsufficientCreditsError).error_code === "INSUFFICIENT_CREDITS"
  );
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }
}

async function postMailFinder(
  path: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonResponse(response);
  return { response, data };
}

function ensureApiSuccess<T>(response: Response, data: unknown, fallbackMessage: string): T {
  if (response.status === 402 && isInsufficientCreditsError(data)) {
    throw new Error(`Insufficient credits. You have ${data.balance} credits remaining.`);
  }

  const parsed = data as T;
  const errorPayload = data as { error?: boolean; message?: string };
  if (!response.ok || errorPayload.error) {
    throw new Error(errorPayload.message || fallbackMessage);
  }

  return parsed;
}

export async function enrichPerson(
  firstName: string,
  lastName: string,
  companyWebsite: string,
): Promise<EnrichPersonResponse> {
  const { response, data } = await postMailFinder("/functions/v1/spend-and-enrich-person", {
    first_name: firstName,
    last_name: lastName,
    company_website: companyWebsite,
  });

  return ensureApiSuccess<EnrichPersonResponse>(response, data, "Failed to enrich person");
}

export async function searchPerson(domain: string, page: number = 1): Promise<SearchPersonResponse> {
  const { response, data } = await postMailFinder("/functions/v1/spend-and-search-person", {
    page,
    filters: {
      company: {
        websites: {
          include: [domain],
        },
      },
    },
  });

  return ensureApiSuccess<SearchPersonResponse>(response, data, "Failed to search people");
}

export async function fetchCredits(): Promise<number> {
  const { response, data } = await postMailFinder("/functions/v1/get-credits", {});
  const parsed = ensureApiSuccess<CreditsResponse>(response, data, "Failed to fetch credits");
  return parsed.balance;
}
