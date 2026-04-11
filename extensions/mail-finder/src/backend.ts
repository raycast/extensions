import { getPreferenceValues } from "@raycast/api";
import { API_BASE_URL } from "./config";
import type { JobHistory, FundingEvent, EnrichedData } from "./types";

// * Get API key from preferences
export function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey?.trim()) {
    throw new Error("API key not configured");
  }
  return apiKey.trim();
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

// * Error types (internal)
interface InsufficientCreditsError {
  error: true;
  error_code: "INSUFFICIENT_CREDITS";
  message: string;
  balance: number;
}

function isInsufficientCreditsError(data: unknown): data is InsufficientCreditsError {
  return (
    typeof data === "object" &&
    data !== null &&
    "error_code" in data &&
    (data as InsufficientCreditsError).error_code === "INSUFFICIENT_CREDITS"
  );
}

// * Map enrich response to EnrichedData
export function mapEnrichResponseToData(response: EnrichPersonResponse, domain: string): EnrichedData | null {
  if (!response.person?.email?.email) return null;

  return {
    person: {
      first_name: response.person.first_name,
      last_name: response.person.last_name,
      full_name: response.person.full_name,
      headline: response.person.headline || null,
      linkedin_url: response.person.linkedin_url || null,
      current_job_title: response.person.current_job_title || undefined,
      job_history: (response.person.job_history || []) as EnrichedData["person"]["job_history"],
      mobile: response.person.mobile
        ? {
            status: response.person.mobile.status,
            mobile_international: response.person.mobile.mobile_international || null,
            mobile_country: response.person.mobile.mobile_country,
          }
        : null,
      email: {
        status: response.person.email.status,
        email: response.person.email.email,
        email_mx_provider: response.person.email.email_mx_provider,
      },
      location: response.person.location
        ? {
            country: response.person.location.country,
            city: response.person.location.city,
            state: response.person.location.state,
            country_code: response.person.location.country_code,
          }
        : null,
    },
    company: {
      name: response.company?.name || domain,
      website: response.company?.website || `https://${domain}`,
      domain: response.company?.domain || domain,
      type: response.company?.type || null,
      industry: response.company?.industry || "",
      description_ai: response.company?.description_ai || null,
      employee_range: response.company?.employee_range || "",
      employee_count: response.company?.employee_count,
      founded: response.company?.founded || 0,
      linkedin_url: response.company?.linkedin_url || null,
      twitter_url: response.company?.twitter_url || null,
      logo_url: response.company?.logo_url || null,
      location: response.company?.location
        ? {
            country: response.company.location.country,
            city: response.company.location.city,
            raw_address: response.company.location.raw_address,
          }
        : null,
      revenue_range_printed: response.company?.revenue_range_printed || null,
      funding: response.company?.funding
        ? {
            total_funding_printed: response.company.funding.total_funding_printed,
            latest_funding_stage: response.company.funding.latest_funding_stage,
            latest_funding_date: response.company.funding.latest_funding_date,
            funding_events: response.company.funding.funding_events,
          }
        : null,
      keywords: response.company?.keywords,
    },
  };
}

// * Enrich person (find email) - costs 1 credit
export async function enrichPerson(
  firstName: string,
  lastName: string,
  companyWebsite: string,
): Promise<EnrichPersonResponse> {
  const apiKey = getApiKey();

  const response = await fetch(`${API_BASE_URL}/functions/v1/spend-and-enrich-person`, {
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

  const data = await response.json();

  if (response.status === 402 && isInsufficientCreditsError(data)) {
    throw new Error(`Insufficient credits. You have ${data.balance} credits remaining.`);
  }

  if (!response.ok || data.error) {
    throw new Error(data.message || "Failed to enrich person");
  }

  return data as EnrichPersonResponse;
}

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

// * Search people by company domain - costs 1 credit
export async function searchPerson(domain: string, page: number = 1): Promise<SearchPersonResponse> {
  const apiKey = getApiKey();

  const filters: Record<string, unknown> = {
    company: {
      websites: {
        include: [domain],
      },
    },
  };

  const response = await fetch(`${API_BASE_URL}/functions/v1/spend-and-search-person`, {
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

  const data = await response.json();

  if (response.status === 402 && isInsufficientCreditsError(data)) {
    throw new Error(`Insufficient credits. You have ${data.balance} credits remaining.`);
  }

  if (!response.ok || data.error) {
    throw new Error(data.message || "Failed to search people");
  }

  return data as SearchPersonResponse;
}
