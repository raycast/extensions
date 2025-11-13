import { z } from "zod";
import { getEnv } from "../defaults";
import { useFetch } from "@raycast/utils";

/**
 * Configuration for creating an EVA service fetcher
 */
interface EvaFetchConfig<TRequest extends z.ZodTypeAny, TResponse extends z.ZodTypeAny> {
  /**
   * The name of the EVA service (e.g., "GetOrganization", "ListProducts")
   */
  serviceName: string;

  /**
   * Zod schema for validating request data before sending
   */
  requestSchema: TRequest;

  /**
   * Zod schema for validating and parsing response data
   */
  responseSchema: TResponse;
}

/**
 * Options for hook-based EVA service calls
 */
export interface UseEvaServiceOptions {
  /**
   * Override the default endpoint
   */
  endpoint?: string;

  /**
   * Override the default API token
   */
  token?: string;

  /**
   * Additional headers to include in the request
   */
  headers?: Record<string, string>;

  /**
   * Keep previous data while loading new data
   */
  keepPreviousData?: boolean;
}

/**
 * Options for individual fetch calls
 */
export interface EvaFetchOptions {
  /**
   * Override the default endpoint
   */
  endpoint?: string;

  /**
   * Override the default API token
   * When provided, skips cookie reading for auth token
   */
  token?: string;

  /**
   * Additional headers to include in the request
   */
  headers?: Record<string, string>;
}

/**
 * Error class for EVA API errors with structured error information
 */
export class EvaApiError extends Error {
  constructor(
    public serviceName: string,
    public status: number,
    public statusText: string,
    public responseBody: string
  ) {
    super(`EVA service ${serviceName} failed: ${status} ${statusText}`);
    this.name = "EvaApiError";
  }
}

/**
 * Creates a type-safe fetcher for an EVA service with Zod validation
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import { createEvaFetcher } from "./utils/eva-fetch";
 *
 * // Define schemas
 * const getOrgRequest = z.object({
 *   ID: z.number()
 * });
 *
 * const getOrgResponse = z.object({
 *   ID: z.number(),
 *   Name: z.string(),
 *   BackendID: z.string().optional()
 * });
 *
 * // Create fetcher
 * const getOrganization = createEvaFetcher({
 *   serviceName: "GetOrganization",
 *   requestSchema: getOrgRequest,
 *   responseSchema: getOrgResponse
 * });
 *
 * // Use it
 * const org = await getOrganization({ ID: 1 });
 * console.log(org.Name); // Type-safe!
 * ```
 */
export function createEvaFetcher<TRequest extends z.ZodTypeAny, TResponse extends z.ZodTypeAny>(
  config: EvaFetchConfig<TRequest, TResponse>
) {
  const { serviceName, requestSchema, responseSchema } = config;

  return async (data: z.input<TRequest>, options: EvaFetchOptions = {}): Promise<z.output<TResponse>> => {
    // Get preferences
    const preferences = getEnv();

    // Validate request data
    let validatedRequest: z.output<TRequest>;
    try {
      validatedRequest = requestSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid request data for ${serviceName}: ${error.issues
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      throw error;
    }

    // Prepare endpoint and token
    const endpoint = options.endpoint ?? preferences.endpoint;
    const url = `${endpoint}/message/${serviceName}`;

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Eva-User-Agent": "Raycast",
      "Eva-Ids-Mode": preferences.useStringIds ? "StringIDs" : "numeric",
      ...options.headers,
    };

    // Get auth token: prioritize explicit token option, fallback to cookie
    // This allows cached services to pass token explicitly while uncached
    // services continue to read from cookies automatically
    let authToken = options.token;
    if (!authToken) {
      authToken = preferences.token;
    }

    if (authToken) {
      headers.Authorization = `eva ${authToken}`;
    }

    // Make the request
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(validatedRequest),
      });
    } catch (error) {
      throw new Error(
        `Network error calling EVA service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new EvaApiError(serviceName, response.status, response.statusText, errorText);
    }

    // Parse JSON response
    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch (error) {
      throw new Error(
        `Failed to parse JSON response from ${serviceName}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Validate and parse response data
    try {
      const validatedResponse = responseSchema.parse(jsonData);
      return validatedResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid response data from ${serviceName}: ${error.issues
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((e: any) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      throw error;
    }
  };
}

/**
 * Creates a React hook for an EVA service with automatic request handling and Zod validation
 *
 * @example
 * ```tsx
 * import { z } from "zod";
 * import { createEvaServiceHook } from "./lib/fetch-eva";
 *
 * // Define schemas
 * const getOrgRequest = z.object({ ID: z.number() });
 * const getOrgResponse = z.object({
 *   ID: z.number(),
 *   Name: z.string(),
 * });
 *
 * // Create hook
 * const useGetOrganization = createEvaServiceHook({
 *   serviceName: "GetOrganization",
 *   requestSchema: getOrgRequest,
 *   responseSchema: getOrgResponse
 * });
 *
 * // Use in component
 * function MyComponent() {
 *   const { data, isLoading, error } = useGetOrganization({ ID: 1 });
 *   return <div>{data?.Name}</div>;
 * }
 * ```
 */
export function createEvaServiceHook<TRequest extends z.ZodTypeAny, TResponse extends z.ZodTypeAny>(
  config: EvaFetchConfig<TRequest, TResponse>
) {
  const { serviceName, requestSchema, responseSchema } = config;

  return function useEvaService(request: z.input<TRequest>, options: UseEvaServiceOptions = {}) {
    // Get preferences
    const preferences = getEnv();

    const endpoint = options.endpoint ?? preferences.endpoint;
    const url = `${endpoint}/message/${serviceName}`;

    // Validate request data
    let validatedRequest: z.output<TRequest>;
    try {
      validatedRequest = requestSchema.parse(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid request data for ${serviceName}: ${error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`
        );
      }
      throw error;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Eva-User-Agent": "Raycast",
      "Eva-Ids-Mode": preferences.useStringIds ? "StringIDs" : "numeric",
      ...options.headers,
    };

    // Get auth token
    const authToken = options.token ?? preferences.token;
    if (authToken) {
      headers.Authorization = `eva ${authToken}`;
    }

    return useFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(validatedRequest),
      keepPreviousData: options.keepPreviousData ?? true,
      parseResponse: async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new EvaApiError(serviceName, response.status, response.statusText, errorText);
        }

        const jsonData = await response.json();

        try {
          return responseSchema.parse(jsonData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error(
              `Invalid response data from ${serviceName}: ${error.issues
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`
            );
          }
          throw error;
        }
      },
    });
  };
}
