// API Routes response type
export interface ApiRoute {
  file: string;
  methods: string[];
  path: string;
}

// Page Routes response type
export type LoadingStatus = "co-located" | "inherited" | "missing";
export type ErrorStatus = "co-located" | "inherited" | "missing";

export interface PageRoute {
  file: string;
  path: string;
  loading: LoadingStatus;
  error: ErrorStatus;
  loadingPath?: string;
  errorPath?: string;
}

// Common HTTP methods for filtering
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
