// Types derived from OpenAPI schema

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol?: string;
  currencyTypeId?: string;
  currencyType?: CurrencyType;
  usdValue?: number | null;
  lastRateUpdate?: string | null;
}

export interface CurrencyType {
  id: string;
  name: string;
  description?: string;
}

export interface Box {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  count: number;
  totalValue: number;
  totalValueExtra?: Record<string, { total: number; code: string; name: string }> | null;
  currencyId?: string | null;
  currency?: Currency;
  baseCurrencyId: string;
  baseCurrency?: Currency;
  createdAt: string;
  updatedAt: string;
}

export interface BoxStats {
  firstSadaqahAt?: string | null;
  lastSadaqahAt?: string | null;
  totalSadaqahs: number;
}

export interface Sadaqah {
  id: string;
  boxId: string;
  value: number;
  currencyId: string;
  currency?: Currency;
  userId?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  boxId: string;
  emptiedAt: string;
  totalValue: number;
  totalValueExtra?: Record<string, { total: number; code: string; name: string }> | null;
  metadata?: {
    conversions?: Array<{
      currencyId: string;
      code: string;
      name: string;
      symbol?: string | null;
      value: number;
      rate: number;
    }>;
    preferredCurrencyId?: string;
    preferredCurrencyCode?: string;
  } | null;
  currencyId: string;
  currency?: Currency;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Request types
export interface CreateBoxRequest {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
  baseCurrencyId?: string;
}

export interface UpdateBoxRequest {
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
  baseCurrencyId?: string;
}

export interface AddSadaqahRequest {
  amount?: number;
  value?: number;
  currencyId?: string;
  metadata?: Record<string, string>;
}

export interface CreateCurrencyRequest {
  code: string;
  name: string;
  symbol?: string;
  currencyTypeId?: string;
  usdValue?: number;
}

export interface CreateCurrencyTypeRequest {
  name: string;
  description?: string;
}

// Response types
export interface HealthResponse {
  success: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
}

export interface StatsResponse {
  success: boolean;
  totalBoxes: number;
  totalSadaqahs: number;
  totalValue: number;
  totalValueExtra: Record<string, { total: number; code: string; name: string }> | null;
  uniqueCurrencies: number;
  primaryCurrency: Currency | null;
}

export interface ListBoxesResponse {
  success: boolean;
  boxes: Box[];
  summary: {
    totalBoxes: number;
    totalCoins: number;
    totalValue: number;
  };
}

export interface BoxResponse {
  success: boolean;
  box: Box;
}

export interface BoxWithStatsResponse {
  success: boolean;
  box: Box;
  stats: BoxStats;
}

export interface EmptyBoxResponse {
  success: boolean;
  box: Box;
  collection: Collection;
}

export interface ListCollectionsResponse {
  success: boolean;
  collections: Collection[];
  pagination: Pagination;
}

export interface ListSadaqahsResponse {
  success: boolean;
  sadaqahs: Sadaqah[];
  pagination: Pagination;
}

export interface AddSadaqahResponse {
  success: boolean;
  sadaqahs: Sadaqah[];
  box: Box;
  message: string;
}

export interface DeleteSadaqahResponse {
  success: boolean;
  deleted: boolean;
  updatedBox?: {
    id: string;
    name: string;
    count: number;
    totalValue: number;
    currencyId?: string;
  };
}

export interface ListCurrenciesResponse {
  success: boolean;
  currencies: Currency[];
}

export interface CurrencyResponse {
  success: boolean;
  currency: Currency;
}

export interface UpdateGoldRatesResponse {
  success: boolean;
  updated: number;
  errors?: string[];
}

export interface ListCurrencyTypesResponse {
  success: boolean;
  currencyTypes: CurrencyType[];
}

export interface CurrencyTypeResponse {
  success: boolean;
  currencyType: CurrencyType;
}

export interface DeleteResponse {
  success: boolean;
  deleted: boolean;
  sadaqahsDeleted?: number;
  collectionsDeleted?: number;
}

export interface ApiErrorResponse {
  success: boolean;
  error: string;
  code?: string;
}

// Better Auth API Key Types
export interface ApiKey {
  id: string;
  name?: string | null;
  start?: string | null;
  prefix?: string | null;
  userId: string;
  refillInterval?: number | null;
  refillAmount?: number | null;
  lastRefillAt?: string | null;
  enabled: boolean;
  rateLimitEnabled: boolean;
  rateLimitTimeWindow?: number | null;
  rateLimitMax?: number | null;
  requestCount: number;
  remaining?: number | null;
  lastRequest?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateApiKeyRequest {
  name?: string | null;
  expiresIn?: string | null;
  prefix?: string | null;
  remaining?: string | null;
  metadata?: string | null;
  refillAmount?: number | null;
  refillInterval?: number | null;
  rateLimitTimeWindow?: number | null;
  rateLimitMax?: number | null;
  rateLimitEnabled?: boolean | null;
  permissions?: string | null;
}

export interface CreateApiKeyResponse extends ApiKey {
  key: string;
}

export interface UpdateApiKeyRequest {
  keyId: string;
  name?: string | null;
  enabled?: boolean | null;
}

export interface ListApiKeysResponse {
  apiKeys: ApiKey[];
}

// Better Auth User Types
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: string | null;
}

export interface AuthSession {
  id: string;
  expiresAt: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
  impersonatedBy?: string | null;
}

// Preset Types for LocalStorage
export interface Preset {
  id: string;
  name: string;
  value: number;
  currencyId: string;
  amount?: number;
  createdAt: string;
  isDefault?: boolean;
  order?: number;
}

export interface PresetsStorage {
  presets: Preset[];
}
