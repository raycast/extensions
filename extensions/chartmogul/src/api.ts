import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import qs from "querystring";

export const BASE_URL = "https://api.chartmogul.com";

const getAPIKey = () => {
  const apiKey = getPreferenceValues<Preferences>().apiKey;

  if (!apiKey) {
    throw new Error("API key is not set");
  }

  return apiKey;
};

const getHeaders = () => {
  return {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(getAPIKey()).toString("base64")}`,
  };
};

const buildQueryString = (params: Record<string, string | string[] | number | boolean | null | undefined>): string => {
  const definedParams: Record<string, string | string[] | number | boolean | null> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      definedParams[key] = value;
    }
  }

  return qs.stringify(definedParams);
};

export type KeyMetricsOptions = {
  "start-date"?: string;
  "end-date"?: string;
  interval?: "day" | "week" | "month" | "quarter" | "year";
  /** ISO 3166-1 Alpha-2 country code */
  geo?: string;
  plans?: string[];
};

/**
 * All currency numbers are in cents.
 */
export type KeyMetricsResponse = {
  entries: {
    date: string;
    mrr: number;
    "mrr-percentage-change": number;
    arr: number;
    "arr-percentage-change": number;
    "customer-churn-rate": number;
    "customer-churn-rate-percentage-change": number;
    "mrr-churn-rate": number;
    "mrr-churn-rate-percentage-change": number;
    ltv: number;
    "ltv-percentage-change": number;
    customers: number;
    "customers-percentage-change": number;
    asp: number;
    "asp-percentage-change": number;
    arpa: number;
    "arpa-percentage-change": number;
  }[];
};

export function useKeyMetrics(options: KeyMetricsOptions = {}) {
  return useFetch<KeyMetricsResponse>(`${BASE_URL}/v1/metrics/all?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export function fetchKeyMetrics(options: KeyMetricsOptions = {}) {
  return fetch(`${BASE_URL}/v1/metrics/all?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ActivitiesOptions = {
  "start-date"?: string;
  "end-date"?: string;
  type?: "new_biz" | "reactivation" | "expansion" | "contraction" | "churn";
  order?: string;
  "start-after"?: string;
  "per-page"?: number;
  cursor?: string;
};

/**
 * All currency numbers are in cents.
 */
export type ActivitiesResponse = {
  entries: {
    description: string;
    "activity-mrr-movement": number;
    "activity-mrr": number;
    "activity-arr": number;
    date: string;
    type: string;
    currency: string;
    "subscription-external-id": string;
    "plan-external-id": string;
    "customer-name": string;
    "customer-uuid": string;
    "customer-external-id": string;
    "billing-connector-uuid": string;
    uuid: string;
  }[];
  cursor: string;
  has_more: boolean;
};

export function useActivities(options: ActivitiesOptions = {}) {
  return useFetch<ActivitiesResponse>(`${BASE_URL}/v1/activities?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type CustomersOptions = {
  data_source_uuid?: string;
  external_id?: string;
  status?: "New_Lead" | "Working_Lead" | "Qualified_Lead" | "Unqualified_Lead" | "Active" | "Past_Due" | "Cancelled";
  system?: string;
  cursor?: string;
  per_page?: number;
  email?: string;
};

export type CustomersResponse = {
  entries: Array<{
    id: number;
    uuid: string;
    external_id: string;
    name: string;
    email: string;
    status: string;
    "customer-since": string;
    attributes: {
      tags: string[];
      stripe: {
        uid: number;
        coupon: boolean;
      };
      custom: {
        CAC: number;
        utmCampaign: string;
        convertedAt: string;
        pro: boolean;
        salesRep: string;
      };
    };
    address: {
      address_zip: string;
      city: string;
      state: string;
      country: string;
    };
    data_source_uuid: string;
    data_source_uuids: string[];
    external_ids: string[];
    company: string;
    country: string;
    state: string;
    city: string;
    zip: string;
    lead_created_at: string | null;
    free_trial_started_at: string | null;
    mrr: number;
    arr: number;
    "billing-system-url": string;
    "chartmogul-url": string;
    "billing-system-type": string;
    currency: string;
    "currency-sign": string;
  }>;
  per_page?: number;
  page?: number;
  current_page?: number;
  total_pages?: number;
  cursor: string;
  has_more: boolean;
};

export function useCustomers(options: CustomersOptions = {}) {
  return useFetch<CustomersResponse>(
    `${BASE_URL}/v1/customers${options.email ? "/search" : ""}?${buildQueryString(options)}`,
    {
      headers: getHeaders(),
    },
  );
}

export function searchCustomers(email: string) {
  return fetch(`${BASE_URL}/v1/customers/search?${buildQueryString({ email })}`, {
    headers: getHeaders(),
  });
}

export type ListCustomersOptions = {
  data_source_uuid?: string;
  status?: string;
  cursor?: string;
  per_page?: number;
};

export function listCustomers(options: ListCustomersOptions) {
  return fetch(`${BASE_URL}/v1/customers?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type DataSourcesResponse = {
  data_sources: Array<{
    uuid: string;
    name: string;
    system: string;
    created_at: string;
    status: string;
  }>;
};

export function listDataSources() {
  return fetch(`${BASE_URL}/v1/data_sources`, {
    headers: getHeaders(),
  });
}

export type ListCustomerActivitiesOptions = {
  customer_uuid: string;
  cursor?: string;
  per_page?: number;
};

export function listCustomerActivities(options: ListCustomerActivitiesOptions) {
  const { customer_uuid, ...rest } = options;
  return fetch(`${BASE_URL}/v1/customers/${customer_uuid}/activities?${buildQueryString(rest)}`, {
    headers: getHeaders(),
  });
}

export function listActivities(options: ActivitiesOptions) {
  return fetch(`${BASE_URL}/v1/activities?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type AccountDetailsResponse = {
  name: string;
  currency: string;
  timezone: string;
  week_start_on: "monday" | "sunday";
};

export function retrieveAccountDetails() {
  return fetch(`${BASE_URL}/v1/account`, {
    headers: getHeaders(),
  });
}

export type ListOpportunitiesOptions = {
  cursor?: string;
  per_page?: number;
  owner?: string;
  stage?: string;
  forecast_category?: "upside" | "commit" | "best_case" | "closed";
  win_likelihood_gte?: number;
  win_likelihood_lte?: number;
};

export type OpportunitiesResponse = {
  entries: Array<{
    uuid: string;
    customer_uuid: string;
    owner: string;
    pipeline: string;
    pipeline_stage: string;
    estimated_close_date: string;
    currency: string;
    amount_in_cents: number;
    type: string;
    forecast_category: string;
    win_likelihood: number;
    custom: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  cursor: string;
  has_more: boolean;
};

export function listOpportunities(options: ListOpportunitiesOptions = {}) {
  return fetch(`${BASE_URL}/v1/opportunities?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ListCallLogsOptions = {
  cursor?: string;
  per_page?: number;
  author?: string;
  contact_uuid?: string;
  customer_uuid?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  call_log?: boolean;
  note?: boolean;
};

export type CallLogsResponse = {
  entries: Array<{
    uuid: string;
    customer_uuid: string;
    contact_uuid?: string;
    opportunity_uuid?: string;
    author: string;
    text: string;
    call_log: boolean;
    created_at: string;
    updated_at: string;
  }>;
  cursor: string;
  has_more: boolean;
};

export function listCallLogs(options: ListCallLogsOptions = {}) {
  return fetch(`${BASE_URL}/v1/customer_notes?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ListContactsOptions = {
  cursor?: string;
  per_page?: number;
  customer_uuid?: string;
  data_source_uuid?: string;
};

export type ContactsResponse = {
  entries: Array<{
    uuid: string;
    customer_uuid: string;
    data_source_uuid: string;
    first_name: string;
    last_name: string;
    email: string;
    title: string;
    phone: string;
    linkedin: string;
    twitter: string;
    custom: Record<string, unknown>;
    position: number;
    created_at: string;
    updated_at: string;
  }>;
  cursor: string;
  has_more: boolean;
};

export function listContacts(options: ListContactsOptions = {}) {
  return fetch(`${BASE_URL}/v1/contacts?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ListTasksOptions = {
  cursor?: string;
  per_page?: number;
  owner?: string;
  customer_uuid?: string;
  contact_uuid?: string;
  opportunity_uuid?: string;
  type?: string;
  status?: "pending" | "completed" | "cancelled";
  due_date_gte?: string;
  due_date_lte?: string;
};

export type TasksResponse = {
  entries: Array<{
    uuid: string;
    customer_uuid: string;
    contact_uuid?: string;
    opportunity_uuid?: string;
    owner: string;
    type: string;
    status: string;
    title: string;
    description: string;
    due_date: string;
    created_at: string;
    updated_at: string;
  }>;
  cursor: string;
  has_more: boolean;
};

export function listTasks(options: ListTasksOptions = {}) {
  return fetch(`${BASE_URL}/v1/tasks?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ListPlansOptions = {
  cursor?: string;
  per_page?: number;
  data_source_uuid?: string;
  external_id?: string;
};

export type PlansResponse = {
  plans: Array<{
    uuid: string;
    data_source_uuid: string;
    name: string;
    interval_count: number;
    interval_unit: string;
    external_id: string;
  }>;
  current_page: number;
  total_pages: number;
};

export function listPlans(options: ListPlansOptions = {}) {
  return fetch(`${BASE_URL}/v1/plans?${buildQueryString(options)}`, {
    headers: getHeaders(),
  });
}

export type ListCustomerSubscriptionsOptions = {
  customer_uuid: string;
  cursor?: string;
  per_page?: number;
};

export type CustomerSubscriptionsResponse = {
  entries: Array<{
    uuid: string;
    customer_uuid: string;
    plan_uuid: string;
    cancellation_dates: string[];
    billing_cycles_count: number;
    data_source_uuid: string;
    status: string;
    billing_cycle: string;
    start_date: string;
    end_date: string;
    currency: string;
    currency_sign: string;
  }>;
  cursor: string;
  has_more: boolean;
};

export function listCustomerSubscriptions(options: ListCustomerSubscriptionsOptions) {
  const { customer_uuid, ...rest } = options;
  return fetch(`${BASE_URL}/v1/customers/${customer_uuid}/subscriptions?${buildQueryString(rest)}`, {
    headers: getHeaders(),
  });
}
