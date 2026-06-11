import { getPreferenceValues } from "@raycast/api";

const API_BASE = "https://trustmrr.com/api/v1";

type ListParams = {
  page?: number;
  limit?: number;
  sort?: string;
  onSale?: "true" | "false";
  category?: string;
  xHandle?: string;
  minRevenue?: number;
  maxRevenue?: number;
  minMrr?: number;
  maxMrr?: number;
  minGrowth?: number;
  maxGrowth?: number;
  minPrice?: number;
  maxPrice?: number;
};

export type Startup = {
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  foundedDate: string | null;
  category: string | null;
  paymentProvider: string;
  targetAudience: string | null;
  revenue: {
    last30Days: number;
    mrr: number;
    total: number;
  };
  customers: number;
  activeSubscriptions: number;
  askingPrice: number | null;
  profitMarginLast30Days: number | null;
  growth30d: number | null;
  multiple: number | null;
  onSale: boolean;
  firstListedForSaleAt: string | null;
  xHandle: string | null;
};

export type StartupDetail = Startup & {
  xFollowerCount: number | null;
  isMerchantOfRecord: boolean;
  techStack: Array<{
    slug: string;
    category: string;
  }>;
  cofounders: Array<{
    xHandle: string;
    xName: string | null;
  }>;
};

export type PaginatedStartupsResponse = {
  data: Startup[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

type StartupResponse = {
  data: StartupDetail;
};

function getAuthHeader() {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { Authorization: `Bearer ${apiKey}` };
}

async function fetchTrustMrr<T>(path: string, params?: ListParams): Promise<T> {
  const search = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        search.set(key, String(value));
      }
    }
  }

  const query = search.toString();
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      ...getAuthHeader(),
    },
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const maybeError =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: unknown }).error
        : undefined;
    const message =
      typeof maybeError === "string" ? maybeError : `TrustMRR request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function listStartups(params?: ListParams): Promise<PaginatedStartupsResponse> {
  return fetchTrustMrr<PaginatedStartupsResponse>("/startups", params);
}

export async function getStartup(slug: string): Promise<StartupDetail> {
  const response = await fetchTrustMrr<StartupResponse>(`/startups/${encodeURIComponent(slug)}`);
  return response.data;
}

export function formatUsd(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
