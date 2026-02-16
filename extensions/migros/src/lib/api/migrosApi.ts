// Native Migros API client - replaces migros-api-wrapper dependency.
// Implements direct HTTP calls with TLSv1.3 and proper headers to avoid Cloudflare blocking.

import axios, { AxiosInstance } from "axios";
import * as https from "https";

// Re-export all types for consumers
export * from "./types";

// Import types for internal use
import type {
  CooperativeInfo,
  FulfillmentSelection,
  GuestToken,
  ProductCard,
  ProductCardsOptions,
  ProductDetail,
  ProductDetailOptions,
  ProductSearchResult,
  ProductSupply,
  PromotionsResponse,
  SearchFilters,
  StoreInfo,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = "https://www.migros.ch";

const DEFAULT_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0",
};

// API path constants
export const migrosApiPaths = {
  guestToken: "/authentication/public/v1/api/guest",
  productSearch: "/onesearch-oc-seaapi/public/v5/search",
  storeSearch: "/store/public/v1/stores/search",
  productAvailability: "/store-availability/public/v2/availabilities/products",
  productCards: "/product-display/public/v4/product-cards",
  cooperatives: "/fulfilment-selector/public/cooperatives",
  promotions: "/product-display/public/v1/promotions/personalized",
  fulfillmentSelection: "/fulfilment-selector/public/v1/fulfilment-selection",
  productDetail: "/product-display/public/v3/product-detail",
};

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Client
// ─────────────────────────────────────────────────────────────────────────────

// HTTPS agent with TLSv1.3 minimum - critical for bypassing Cloudflare protection
const httpsAgent = new https.Agent({
  minVersion: "TLSv1.3",
});

interface ClientOptions {
  token?: string;
  language?: string;
  contentType?: "json";
}

function createClient(options: ClientOptions = {}): AxiosInstance {
  const { token, language, contentType } = options;

  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (token) {
    headers["leshopch"] = token;
  }

  if (language) {
    headers["Accept-Language"] = language;
    headers["Migros-Language"] = language;
  }

  if (contentType === "json") {
    headers["Content-Type"] = "application/json";
  }

  return axios.create({
    baseURL: BASE_URL,
    headers,
    httpsAgent,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function getGuestToken(): Promise<GuestToken> {
  const client = createClient({});
  const response = await client.get(migrosApiPaths.guestToken, {
    params: { authorizationNotRequired: true },
  });

  // Token is returned in 'leshopch' response header
  const leshopch = response.headers["leshopch"] || response.headers["Leshopch"];

  // Also check response body for token info
  const body = response.data;
  const tokenValue = leshopch || (body && (body.token || body.access_token || body.leshopch));

  return {
    token: tokenValue,
    access_token: body?.access_token,
    leshopch: leshopch || body?.leshopch,
  };
}

export async function searchProduct(
  query: string,
  token?: string,
  language: string = "de",
  region: string = "national",
  filters?: SearchFilters,
): Promise<ProductSearchResult> {
  const client = createClient({ token, language, contentType: "json" });

  const requestBody: Record<string, unknown> = {
    regionId: region,
    language,
    productIds: [],
    query,
    sortFields: [],
    sortOrder: "asc",
    algorithm: "DEFAULT",
    from: 0,
    limit: 100,
  };

  if (filters) {
    requestBody.filters = filters;
  }

  const response = await client.post(migrosApiPaths.productSearch, requestBody);

  return response.data;
}

export async function getProductCards(options: ProductCardsOptions, token?: string): Promise<ProductCard[]> {
  // Default language
  if (!options.language) {
    options.language = "de";
  }

  const client = createClient({ token, language: options.language, contentType: "json" });

  // Default offerFilter values
  if (!options.offerFilter) {
    options.offerFilter = {
      storeType: "OFFLINE",
      region: "national",
      ongoingOfferDate: new Date().toISOString().split("T")[0] + "T00:00:00",
    };
  } else {
    if (!options.offerFilter.ongoingOfferDate) {
      options.offerFilter.ongoingOfferDate = new Date().toISOString().split("T")[0] + "T00:00:00";
    }
    if (!options.offerFilter.storeType) {
      options.offerFilter.storeType = "OFFLINE";
    }
    if (!options.offerFilter.region) {
      options.offerFilter.region = "national";
    }
  }

  const response = await client.post(migrosApiPaths.productCards, options);

  return response.data;
}

export async function getProductDetail(options: ProductDetailOptions, token?: string): Promise<ProductDetail[]> {
  // Default language
  if (!options.language) {
    options.language = "de";
  }

  const client = createClient({ token, language: options.language, contentType: "json" });

  // Default offerFilter values
  if (!options.offerFilter) {
    options.offerFilter = {
      storeType: "OFFLINE",
      ongoingOfferDate: new Date().toISOString().split("T")[0] + "T00:00:00",
    };
  } else {
    if (!options.offerFilter.ongoingOfferDate) {
      options.offerFilter.ongoingOfferDate = new Date().toISOString().split("T")[0] + "T00:00:00";
    }
    if (!options.offerFilter.storeType) {
      options.offerFilter.storeType = "OFFLINE";
    }
  }

  const response = await client.post(migrosApiPaths.productDetail, options);

  return response.data;
}

export async function searchStoresByQuery(q: string, token?: string): Promise<StoreInfo[]> {
  const client = createClient({ token });

  const response = await client.get(migrosApiPaths.storeSearch, {
    params: { query: q },
  });

  return response.data;
}

export async function getProductSupply(
  pid: string | number,
  costCenterIds: string[] | string,
  token?: string,
): Promise<ProductSupply> {
  const client = createClient({ token });

  // costCenterIds can be array or comma-separated string
  const idsParam = Array.isArray(costCenterIds) ? costCenterIds.join(",") : costCenterIds;

  const url = `${migrosApiPaths.productAvailability}/${pid}`;
  const response = await client.get(url, {
    params: { costCenterIds: idsParam },
  });

  return response.data;
}

export async function getCooperativeByZipCode(zipCode: string, token?: string): Promise<CooperativeInfo | null> {
  const client = createClient({ token });

  const response = await client.get(migrosApiPaths.cooperatives, {
    params: { zipOrCity: zipCode, uniqueMatch: false },
  });

  const cooperatives: CooperativeInfo[] = response.data;
  return cooperatives.length > 0 ? cooperatives[0] : null;
}

export async function getFulfillmentSelection(
  zipCode: string,
  token?: string,
  language: string = "de",
): Promise<FulfillmentSelection> {
  const client = createClient({ token, language });

  const response = await client.get(migrosApiPaths.fulfillmentSelection, {
    params: { zipCode },
  });

  return response.data;
}

export async function getPromotions(
  token?: string,
  language: string = "de",
  region: string = "national",
): Promise<PromotionsResponse> {
  const client = createClient({ token, language });

  const response = await client.get(migrosApiPaths.promotions, {
    params: { region, language },
  });

  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  getGuestToken,
  searchProduct,
  getProductCards,
  getProductDetail,
  searchStoresByQuery,
  getProductSupply,
  getCooperativeByZipCode,
  getFulfillmentSelection,
  getPromotions,
  migrosApiPaths,
};
