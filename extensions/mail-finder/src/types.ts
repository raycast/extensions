export interface JobHistory {
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

export interface PersonLocation {
  country: string;
  city: string;
  state?: string;
  country_code?: string;
}

export interface PersonData {
  first_name: string;
  last_name: string;
  full_name: string;
  headline: string | null;
  linkedin_url: string | null;
  job_history: JobHistory[];
  mobile: {
    status: string;
    mobile_international: string | null;
    mobile_country?: string;
  } | null;
  email: {
    status: string;
    email: string;
    email_mx_provider?: string;
  };
  location: PersonLocation | null;
  current_job_title?: string;
}

export interface FundingEvent {
  amount: number;
  amount_printed: string;
  raised_at: string;
  stage: string;
  link: string;
}

export interface Funding {
  total_funding_printed: string;
  latest_funding_stage: string;
  latest_funding_date: string;
  funding_events?: FundingEvent[];
}

export interface CompanyData {
  name: string;
  website: string;
  domain: string;
  type: string | null;
  industry: string;
  description_ai: string | null;
  employee_range: string;
  founded: number;
  linkedin_url: string | null;
  twitter_url: string | null;
  logo_url: string | null;
  location: {
    country: string;
    city: string;
    raw_address?: string;
  } | null;
  revenue_range_printed: string | null;
  funding: Funding | null;
  employee_count?: number;
  keywords?: string[];
}

export interface EnrichedData {
  person: PersonData;
  company: CompanyData;
}

export interface CachedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  departments: string[];
  linkedinUrl?: string;
  location?: string;
  seniority?: string;
}
