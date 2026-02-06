import { getPreferenceValues } from "@raycast/api";
import crypto from "crypto";
import { BinanceApiError } from "../types";

// Base URLs
export const SPOT_BASE_URL = "https://api.binance.com";
export const USDM_FUTURES_BASE_URL = "https://fapi.binance.com";
export const COINM_FUTURES_BASE_URL = "https://dapi.binance.com";

/**
 * Creates HMAC SHA256 signature for Binance API requests
 */
function createSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

/**
 * Builds signed query string with timestamp and signature
 */
function buildSignedQuery(params: Record<string, string | number> = {}): string {
  const { apiSecret } = getPreferenceValues<Preferences>();
  const timestamp = Date.now();
  const allParams = { ...params, timestamp, recvWindow: 5000 };

  const queryString = new URLSearchParams(
    Object.entries(allParams).map(([key, value]) => [key, String(value)] as [string, string]),
  ).toString();

  const signature = createSignature(queryString, apiSecret);
  return `${queryString}&signature=${signature}`;
}

/**
 * Makes authenticated request to Binance API
 */
export async function authenticatedRequest<T>(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const signedQuery = buildSignedQuery(params);
  const url = `${baseUrl}${endpoint}?${signedQuery}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-MBX-APIKEY": apiKey,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as BinanceApiError;
    throw new Error(error.msg || `API Error: ${response.status}`);
  }

  return data as T;
}

/**
 * Makes public request to Binance API (no authentication)
 */
export async function publicRequest<T>(
  baseUrl: string,
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const queryString = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)] as [string, string]),
  ).toString();

  const url = queryString ? `${baseUrl}${endpoint}?${queryString}` : `${baseUrl}${endpoint}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const error = data as BinanceApiError;
    throw new Error(error.msg || `API Error: ${response.status}`);
  }

  return data as T;
}
