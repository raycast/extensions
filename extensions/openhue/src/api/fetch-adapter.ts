import { hueRequest, HueApiError } from "./client";

/**
 * Custom fetch adapter that wraps the existing hueRequest function
 * to be compatible with the generated typescript-fetch client code.
 *
 * This preserves all existing functionality:
 * - Credential loading from Raycast preferences or ~/.openhue/config.yaml
 * - Self-signed certificate acceptance
 * - Custom error handling via HueApiError
 */
export async function createFetchAdapter(): Promise<typeof fetch> {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Convert fetch arguments to hueRequest format
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Extract path from URL (remove base URL if present)
    const urlObj = new URL(url, "https://dummy.local");
    const endpoint = urlObj.pathname + urlObj.search;

    // Extract method and body
    const method = (init?.method || "GET") as "GET" | "PUT" | "POST" | "DELETE";
    let body: unknown;
    if (init?.body) {
      // Handle body that might already be parsed or is a string
      if (typeof init.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      } else {
        body = init.body;
      }
    }

    try {
      // Make request using existing hueRequest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await hueRequest<any>(endpoint, {
        method,
        body,
      });

      // Convert to fetch Response
      const responseBody = JSON.stringify(result);
      const response = new Response(responseBody, {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response;
    } catch (error) {
      if (error instanceof HueApiError) {
        // Convert HueApiError to fetch Response with error status
        const errorBody = JSON.stringify({
          errors: error.errors || [{ description: error.message }],
        });

        const response = new Response(errorBody, {
          status: error.statusCode || 500,
          statusText: error.message,
          headers: {
            "Content-Type": "application/json",
          },
        });

        return response;
      }

      // Convert unexpected errors to error Response
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorBody = JSON.stringify({
        errors: [{ description: errorMessage }],
      });

      return new Response(errorBody, {
        status: 500,
        statusText: errorMessage,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  };
}

/**
 * Singleton instance of the fetch adapter.
 * Initialized lazily on first use.
 */
let fetchAdapterInstance: typeof fetch | null = null;

/**
 * Get or create the fetch adapter instance.
 * This is used to configure the generated API clients.
 */
export async function getFetchAdapter(): Promise<typeof fetch> {
  if (!fetchAdapterInstance) {
    fetchAdapterInstance = await createFetchAdapter();
  }
  return fetchAdapterInstance;
}
