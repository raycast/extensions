import { getPreferenceValues } from "@raycast/api";
import { SUPABASE_URL } from "./supabase";

// * Response types (matching existing types in email-finder.tsx)
interface JobHistory {
  title: string;
  company_name: string;
  current: boolean;
  start_year: number;
  start_month: number;
  end_year: number | null;
  end_month: number | null;
  seniority: string;
  logo_url?: string | null;
  duration_in_months?: number;
  departments?: string[];
}

interface FundingEvent {
  amount: number;
  amount_printed: string;
  raised_at: string;
  stage: string;
  link: string;
}

// * Enrich Person Response
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

// * Search Person Result
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
    // Legacy field names for backwards compatibility
    page?: number;
    total_pages?: number;
    total_results?: number;
  };
}

// * Error types
export interface InsufficientCreditsError {
  error: true;
  error_code: "INSUFFICIENT_CREDITS";
  message: string;
  balance: number;
}

export interface ApiError {
  error: true;
  message: string;
}

export type BackendError = InsufficientCreditsError | ApiError;

// * Check if response is an insufficient credits error
export function isInsufficientCreditsError(data: unknown): data is InsufficientCreditsError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error_code" in data &&
    (data as InsufficientCreditsError).error_code === "INSUFFICIENT_CREDITS"
  );
}

// * Get API key from preferences
function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey?.trim()) {
    throw new Error("API key not configured");
  }
  return apiKey.trim();
}

// * Enrich person (find email) - costs 1 credit
export async function enrichPerson(
  firstName: string,
  lastName: string,
  companyWebsite: string,
): Promise<EnrichPersonResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/spend-and-enrich-person`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      company_website: companyWebsite,
    }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }

  // * Handle insufficient credits specifically
  if (response.status === 402 && isInsufficientCreditsError(data)) {
    throw new Error(`Insufficient credits. You have ${data.balance} credits remaining.`);
  }

  // * Handle other errors
  const body = data as { error?: boolean; message?: string };
  if (!response.ok || body.error) {
    throw new Error(body.message || "Failed to enrich person");
  }

  return data as EnrichPersonResponse;
}

// * Search people by company domain - costs 1 credit
// * Company Search Result (Clearout API)
export interface CompanySearchResult {
  name: string;
  domain: string;
  confidence_score: number;
  logo_url: string;
}

// * Search company by name using Clearout API (free, no credits)
export async function searchCompanyByName(query: string): Promise<CompanySearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.clearout.io/public/companies/autocomplete?query=${encodeURIComponent(query.trim())}`,
    );

    if (!response.ok) {
      console.error("Clearout API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.status !== "success" || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item: { name: string; domain: string; confidence_score: number; logo_url: string }) => ({
      name: item.name,
      domain: item.domain,
      confidence_score: item.confidence_score,
      logo_url: item.logo_url,
    }));
  } catch (error) {
    console.error("Failed to search company:", error);
    return [];
  }
}

export async function searchPerson(
  domain: string,
  page: number = 1,
  department?: string,
): Promise<SearchPersonResponse> {
  const apiKey = getApiKey();

  const filters: Record<string, unknown> = {
    company: {
      websites: {
        include: [domain],
      },
    },
  };

  // Add department filter if specified (used by "Load More")
  if (department && department !== "all") {
    filters.person_departments = {
      include: [department],
    };
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/spend-and-search-person`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page,
      filters,
    }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }

  // * Handle insufficient credits specifically
  if (response.status === 402 && isInsufficientCreditsError(data)) {
    throw new Error(`Insufficient credits. You have ${data.balance} credits remaining.`);
  }

  // * Handle other errors
  const body = data as { error?: boolean; message?: string };
  if (!response.ok || body.error) {
    throw new Error(body.message || "Failed to search people");
  }

  return data as SearchPersonResponse;
}
