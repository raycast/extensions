import axios from "axios";
import { getPreferenceValues } from "@raycast/api";
import { ApiLoginResponse, CompanyData, Preferences } from "../types";
import { metrics } from "./metrics";

// --- Caching and Rate Limiting Configuration ---

const MAX_CALLS_PER_MINUTE = 30; // Conservative limit to prevent API abuse
const COMPANY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for company data
const AUTH_TOKEN_TTL = 10 * 60 * 1000; // 10 minutes cache for auth token

// --- Module-level State ---

const apiCallTimes: number[] = [];
const companyCache = new Map<string, { data: CompanyData; timestamp: number }>();
let authToken: { token: string; expiresAt: number } | null = null;

const API_BASE_URL = "https://registre-national-entreprises.inpi.fr";

// --- Private Helper Functions ---

/**
 * Implements rate limiting to prevent API abuse. Throws an error if the limit is exceeded.
 */
function checkRateLimit(): void {
  const now = Date.now();
  // Filter out calls older than 1 minute
  while (apiCallTimes.length > 0 && apiCallTimes[0] < now - 60000) {
    apiCallTimes.shift();
  }

  if (apiCallTimes.length >= MAX_CALLS_PER_MINUTE) {
    throw new Error(
      `Rate limit exceeded: Maximum ${MAX_CALLS_PER_MINUTE} requests per minute. Please wait and try again.`,
    );
  }
  apiCallTimes.push(now);
}

/**
 * Generic retry mechanism with exponential backoff for network operations.
 */
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client-side errors (4xx), except for rate limiting (429)
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error; // Fail fast on auth errors, not found, etc.
        }
      }

      if (attempt === maxRetries) {
        break; // Exit loop to throw last error
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`API call failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Creates an Axios client instance with optional authorization token.
 */
const getApiClient = (token?: string) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return axios.create({ baseURL: API_BASE_URL, headers });
};

/**
 * Validates that credentials are present in preferences.
 */
function validateCredentials(username: string, password: string): void {
  if (!username?.trim()) {
    throw new Error("INPI username is required. Please configure it in Raycast preferences.");
  }
  if (!password) {
    throw new Error("INPI password is required. Please configure it in Raycast preferences.");
  }
}

// --- Public API Functions ---

/**
 * Ensures the user is logged in and returns a valid token.
 * Uses an in-memory cache to avoid repeated login calls.
 */
export async function login(): Promise<string> {
  // Return cached token if it's still valid
  if (authToken && authToken.expiresAt > Date.now()) {
    console.log("Using cached auth token.");
    return authToken.token;
  }

  const { inpiUsername, inpiPassword }: Preferences = getPreferenceValues();
  validateCredentials(inpiUsername, inpiPassword);
  checkRateLimit();

  console.log("Authenticating with INPI API...");
  return withRetry(async () => {
    const startTime = Date.now();
    let success = false;
    let statusCode = 0;
    let errorType: string | undefined;

    try {
      const apiClient = getApiClient();
      const response = await apiClient.post<ApiLoginResponse>("/api/sso/login", {
        username: inpiUsername.trim(),
        password: inpiPassword,
      });

      statusCode = response.status;

      if (response.data?.token) {
        console.log("Authentication successful. Caching token.");
        success = true;
        authToken = {
          token: response.data.token,
          expiresAt: Date.now() + AUTH_TOKEN_TTL,
        };
        return authToken.token;
      }
      throw new Error("Invalid login response from INPI API.");
    } catch (error) {
      errorType = axios.isAxiosError(error) ? "AxiosError" : "UnknownError";
      if (axios.isAxiosError(error) && error.response?.status) {
        statusCode = error.response.status;
      }
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("Authentication failed: Invalid INPI credentials.");
        }
        if (error.response?.status === 403) {
          throw new Error("Access denied: Your INPI account may not have API access.");
        }
        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded on login. Please wait.");
        }
      }
      console.error("Authentication failed:", error);
      throw new Error("Failed to authenticate with INPI API. Check credentials and connection.");
    } finally {
      // Record metrics
      const responseTime = Date.now() - startTime;
      metrics.recordApiCall({
        endpoint: "/api/sso/login",
        method: "POST",
        responseTime,
        statusCode,
        success,
        errorType,
      });
    }
  });
}

/**
 * Fetches company data by SIREN. Handles caching and authentication automatically.
 */
export async function getCompanyInfo(siren: string): Promise<CompanyData> {
  // Check company data cache first
  const cached = companyCache.get(siren);
  if (cached && Date.now() - cached.timestamp < COMPANY_CACHE_TTL) {
    console.log(`Using cached data for SIREN ${siren}`);
    return cached.data;
  }

  const token = await login(); // Ensures we have a valid token
  checkRateLimit();

  return withRetry(async () => {
    const startTime = Date.now();
    let success = false;
    let statusCode = 0;
    let errorType: string | undefined;

    try {
      const apiClient = getApiClient(token);
      console.log(`Fetching INPI data for SIREN ${siren}`);
      const response = await apiClient.get(`/api/companies/${siren}`);

      statusCode = response.status;
      success = true;

      // Cache the successful response
      companyCache.set(siren, { data: response.data, timestamp: Date.now() });

      return response.data;
    } catch (error) {
      errorType = axios.isAxiosError(error) ? "AxiosError" : "UnknownError";
      if (axios.isAxiosError(error) && error.response?.status) {
        statusCode = error.response.status;
      }

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`No company found for SIREN ${siren}.`);
        }
        if (error.response?.status === 401) {
          authToken = null; // Token might be expired, clear it
          throw new Error("Authentication expired. Please try again.");
        }
        if (error.response?.status === 403) {
          throw new Error("Access denied for this company's data.");
        }
        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please wait and try again.");
        }
      }
      console.error(`Failed to fetch company data for SIREN ${siren}:`, error);
      throw new Error("Network error while fetching company data.");
    } finally {
      // Record metrics
      const responseTime = Date.now() - startTime;
      metrics.recordApiCall({
        endpoint: `/api/companies/${siren}`,
        method: "GET",
        responseTime,
        statusCode,
        success,
        errorType,
      });
    }
  });
}

/**
 * Clears the in-memory company data cache.
 */
export function clearCompanyCache(): void {
  companyCache.clear();
  console.log("Company data cache cleared.");
}

/**
 * Clears the in-memory authentication token.
 */
export function clearAuthToken(): void {
  authToken = null;
  console.log("Authentication token cleared.");
}
