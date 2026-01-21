import type http from "node:http";

export interface ResolveResult {
  originalUrl: string;
  finalUrl: string;
  redirectCount: number;
  trace: string[];
  finalIp?: string;
  provider?: "cloudflare" | "google" | "quad9" | "opendns";
  error?: string;
}

export interface DoHAnswer {
  type: number; // 1 = A record, 5 = CNAME, 28 = AAAA
  data: string;
}

export interface DoHResponse {
  Answer?: DoHAnswer[];
}

export interface FetchResult {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
}
