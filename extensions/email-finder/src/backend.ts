import type { EnrichedData } from "./types";
import {
  enrichPerson as enrichPersonFromMailFinder,
  getApiKey as getMailFinderApiKey,
  searchPerson as searchPersonFromMailFinder,
} from "./api/mail-finder-client";
import { searchCompanyByName as searchCompanyByNameFromClearout } from "./api/clearout-client";
import type { EnrichPersonResponse, SearchPersonResponse } from "./api/mail-finder-client";
import type { CompanySearchResult } from "./api/clearout-client";

export type { EnrichPersonResponse, SearchPersonResponse, CompanySearchResult };

// Backward-compatible adapter exports while callers migrate to src/api/*
export const getApiKey = getMailFinderApiKey;
export const enrichPerson = enrichPersonFromMailFinder;
export const searchPerson = searchPersonFromMailFinder;
export const searchCompanyByName = searchCompanyByNameFromClearout;

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
