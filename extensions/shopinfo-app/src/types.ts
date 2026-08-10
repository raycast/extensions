export interface ShopifyThemeInfo {
  theme_name?: string;
  theme_version?: string;
  theme_vendor?: string;
  theme_id?: string;
  store_name?: string;
  store_url?: string;
  store_domain?: string;
  platform?: string;
  detected?: boolean;
  confidence?: number;
  details_url?: string;
  documentation_url?: string;
  update_available?: boolean;
  latest_version?: string;
  detection_method?: string;
  checked_at?: string;
  [key: string]: unknown;
}

export interface APIResponse {
  success: boolean;
  data?: ShopifyThemeInfo;
  error?: string;
  message?: string;
}

export interface Preferences {
  apiKey: string;
  apiEndpoint?: string;
}
