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

    // Helper to build a minimal Response-like object without relying on
    // global Response/Headers implementations (which may not exist in
    // the Raycast Node environment).
    const buildResponse = (status: number, statusText: string, payload: unknown): Response => {
      const responseBody = JSON.stringify(payload);

      const responseLike = {
        ok: status >= 200 && status < 300,
        status,
        statusText,
        url,
        redirected: false,
        type: "basic" as ResponseType,
        body: null,
        bodyUsed: true,
        headers: {} as Headers,
        clone() {
          return this as Response;
        },
        async json() {
          return JSON.parse(responseBody);
        },
        async text() {
          return responseBody;
        },
        async arrayBuffer() {
          const encoder = new TextEncoder();
          return encoder.encode(responseBody).buffer;
        },
        async blob() {
          throw new Error("blob() not implemented in custom fetch adapter");
        },
        async formData() {
          throw new Error("formData() not implemented in custom fetch adapter");
        },
      } as unknown as Response;

      return responseLike;
    };

    try {
      // Make request using existing hueRequest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await hueRequest<any>(endpoint, {
        method,
        body,
      });

      return buildResponse(200, "OK", result);
    } catch (error) {
      if (error instanceof HueApiError) {
        // Convert HueApiError to fetch Response with error status
        const errorPayload = {
          errors: error.errors || [{ description: error.message }],
        };
        return buildResponse(error.statusCode || 500, error.message, errorPayload);
      }

      // Convert unexpected errors to error Response
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorPayload = {
        errors: [{ description: errorMessage }],
      };
      return buildResponse(500, errorMessage, errorPayload);
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
