// Store-related types for the Migros API client

export interface StoreLocation {
  zip?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface StoreInfo {
  storeId?: string;
  costCenterId?: string;
  storeName?: string;
  name?: string;
  location?: StoreLocation;
  [k: string]: unknown;
}

export interface ProductSupply {
  catalogItemId?: string | number;
  availabilities?: Array<{ id: string; stock: number | string }>;
}
