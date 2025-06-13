export interface ExtensionPreferences {
  "chhoto-host": string;
  "chhoto-password": string;
}

// API Request Types
export interface CreateUrlRequest {
  shortlink?: string;
  longlink: string;
  expiry_delay?: number; // in seconds, 0 or missing disables expiry
}

// API Response Types
export type CreateUrlResponse = string;
export type ExpandUrlResponse = string;
export type DeleteUrlResponse = string;

// For the /api/all endpoint (list all URLs)
export interface UrlItem {
  shortlink: string;
  longlink: string;
  hits: number;
  expiry_time?: number;
}
