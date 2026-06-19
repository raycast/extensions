/**
 * bunq API HTTP client.
 *
 * This module provides the low-level HTTP client for communicating with
 * the bunq API. It handles:
 *
 * - Request signing using RSA keys
 * - Authentication headers
 * - Error parsing and handling
 * - Request ID generation for idempotency
 *
 * @module api/client
 */

import { getPreferenceValues } from "@raycast/api";
import { createRequestSignature, verifyResponseSignature } from "../lib/crypto";
import { logger } from "../lib/logger";

/**
 * Base URLs for the bunq API environments.
 */
const URLS = {
  sandbox: "https://public-api.sandbox.bunq.com/v1",
  production: "https://api.bunq.com/v1",
} as const;

/**
 * Gets the base URL for API requests based on the configured environment.
 *
 * @returns The base URL for the selected environment (sandbox or production)
 */
export function getBaseUrl(): string {
  const { environment } = getPreferenceValues<Preferences>();
  return URLS[environment];
}

/**
 * Generic wrapper for bunq API responses.
 * All bunq responses contain a Response array with the actual data.
 */
export interface BunqResponse<T> {
  Response: T[];
}

/**
 * Error response structure from the bunq API.
 */
export interface BunqError {
  Error: Array<{
    error_description: string;
    error_description_translated: string;
  }>;
}

/**
 * Custom error class for bunq API errors.
 *
 * Contains the HTTP status code and the error details from the API response.
 */
export class BunqApiError extends Error {
  /**
   * Creates a new BunqApiError.
   *
   * @param message - The primary error message
   * @param statusCode - The HTTP status code from the response
   * @param errors - The detailed error array from the bunq API
   */
  constructor(
    message: string,
    public statusCode: number,
    public errors: BunqError["Error"],
  ) {
    super(message);
    this.name = "BunqApiError";
  }
}

/**
 * Generates a unique request ID for idempotency.
 *
 * bunq uses request IDs to prevent duplicate operations. Each request
 * should have a unique ID.
 *
 * @returns A unique request ID string
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Options for making authenticated API requests.
 */
export interface RequestOptions {
  /** The authentication token (session token or installation token) */
  authToken?: string;
  /** Whether to sign the request body with the private key */
  sign?: boolean;
  /** The RSA private key for signing (required if sign is true) */
  privateKey?: string;
  /** The server's public key for response signature verification (optional) */
  serverPublicKey?: string;
  /** Whether to verify response signatures (defaults to true if serverPublicKey is provided) */
  verifySignature?: boolean;
}

/**
 * Makes an HTTP request to the bunq API.
 *
 * This is the core function for all API communication. It handles:
 * - Building the request URL and headers
 * - Request signing when required
 * - Response parsing and error handling
 *
 * @param method - The HTTP method (GET, POST, PUT, DELETE)
 * @param path - The API endpoint path (e.g., "/user/123/monetary-account")
 * @param body - The request body (will be JSON serialized)
 * @param options - Authentication and signing options
 * @returns The parsed API response
 * @throws BunqApiError if the API returns an error response
 */
export async function bunqRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<BunqResponse<T>> {
  const url = `${getBaseUrl()}${path}`;
  const requestId = generateRequestId();
  const bodyString = body ? JSON.stringify(body) : "";

  logger.debug("API request", { method, path, requestId, hasBody: !!body });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Raycast bunq Extension/1.0.0",
    "Cache-Control": "no-cache",
    "X-Bunq-Client-Request-Id": requestId,
    "X-Bunq-Geolocation": "0 0 0 0 000",
    "X-Bunq-Language": "en_US",
    "X-Bunq-Region": "en_US",
  };

  if (options.authToken) {
    headers["X-Bunq-Client-Authentication"] = options.authToken;
  }

  if (options.sign && options.privateKey) {
    const signature = createRequestSignature(options.privateKey, bodyString);
    headers["X-Bunq-Client-Signature"] = signature;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: bodyString || null,
  });

  const responseText = await response.text();
  let responseData: BunqResponse<T> | BunqError;

  try {
    responseData = JSON.parse(responseText);
  } catch {
    logger.error("Invalid JSON response", { statusCode: response.status, path });
    throw new BunqApiError("Invalid JSON response from API", response.status, []);
  }

  if (!response.ok || "Error" in responseData) {
    const errorResponse = responseData as BunqError;
    const errorMessage = errorResponse.Error?.[0]?.error_description || "Unknown error";
    // Log 404s as WARN since they're often expected "feature not available" responses
    const logFn = response.status === 404 ? logger.warn : logger.error;
    logFn("API error", {
      statusCode: response.status,
      message: errorMessage,
      path,
    });
    throw new BunqApiError(errorMessage, response.status, errorResponse.Error || []);
  }

  // Verify response signature if server public key is provided
  const shouldVerify = options.verifySignature ?? !!options.serverPublicKey;
  if (shouldVerify && options.serverPublicKey) {
    const serverSignature = response.headers.get("X-Bunq-Server-Signature");
    if (serverSignature) {
      const isValid = verifyResponseSignature(options.serverPublicKey, responseText, serverSignature);
      if (!isValid) {
        logger.error("Response signature verification failed", { method, path });
        throw new BunqApiError("Response signature verification failed", response.status, []);
      }
      logger.debug("Response signature verified", { method, path });
    } else {
      logger.error("Missing server signature in response", { method, path });
      throw new BunqApiError("Missing server signature in response", response.status, []);
    }
  }

  logger.debug("API response", { method, path, statusCode: response.status });
  return responseData as BunqResponse<T>;
}

/**
 * Makes a GET request to the bunq API.
 *
 * @param path - The API endpoint path
 * @param options - Authentication options
 * @returns The parsed API response
 */
export async function get<T>(path: string, options?: RequestOptions): Promise<BunqResponse<T>> {
  return bunqRequest<T>("GET", path, undefined, options);
}

/**
 * Makes a POST request to the bunq API.
 *
 * @param path - The API endpoint path
 * @param body - The request body
 * @param options - Authentication and signing options
 * @returns The parsed API response
 */
export async function post<T>(path: string, body: unknown, options?: RequestOptions): Promise<BunqResponse<T>> {
  return bunqRequest<T>("POST", path, body, options);
}

/**
 * Makes a PUT request to the bunq API.
 *
 * @param path - The API endpoint path
 * @param body - The request body
 * @param options - Authentication and signing options
 * @returns The parsed API response
 */
export async function put<T>(path: string, body: unknown, options?: RequestOptions): Promise<BunqResponse<T>> {
  return bunqRequest<T>("PUT", path, body, options);
}

/**
 * Makes a DELETE request to the bunq API.
 *
 * @param path - The API endpoint path
 * @param options - Authentication options
 * @returns The parsed API response
 */
export async function del<T>(path: string, options?: RequestOptions): Promise<BunqResponse<T>> {
  return bunqRequest<T>("DELETE", path, undefined, options);
}
