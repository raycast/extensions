import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
// fetch and FetchResult are no longer needed from @raycast/utils, use global fetch/Response
// Response and RequestInit are globally available, no need for node-fetch import
import { Workflow, Tag } from "../types/types";

interface Preferences {
  instanceUrl: string;
  apiKey: string;
}

// Helper function to get preferences
function getAPICredentials(): Preferences {
  return getPreferenceValues<Preferences>();
}

// Base function for making authenticated API requests
async function fetchN8nApi<T>(
  endpoint: string,
  options: RequestInit = {} // Use global RequestInit
): Promise<T> {
  let fullUrl = "";
  let headers: Record<string, string> = {};

  const { instanceUrl, apiKey } = getAPICredentials();

  // Ensure URL doesn't end with a slash and endpoint doesn't start with one
  const baseUrl = instanceUrl.endsWith("/") ? instanceUrl.slice(0, -1) : instanceUrl;
  const apiEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  fullUrl = `${baseUrl}/api/v1/${apiEndpoint}`;

  headers = {
    ...(options.headers as Record<string, string>), // Assume existing headers are string records
    Accept: "application/json",
    "X-N8N-API-KEY": apiKey,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  try {
    // Use global fetch, which returns a Promise<Response> directly
    const response: Response = await fetch(fullUrl, {
      ...options,
      headers: headers,
    });
    // const response = fetchResult.response; // No longer needed

    if (!response.ok) {
      let errorBody = "Unknown error";
      try {
        // Try to parse error details from n8n response
        const errorJson = (await response.json()) as {
          message?: string;
          error?: string;
        };
        errorBody = errorJson.message || errorJson.error || JSON.stringify(errorJson) || "Unknown error";
      } catch (parseError) {
        // Fallback if parsing fails
        errorBody = await response.text();
      }
      throw new Error(`HTTP error ${response.status}: ${errorBody}`);
    }

    // Handle cases where response might be empty (e.g., 204 No Content for activation)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return {} as T; // Return an empty object or appropriate type for no content
    }

    return (await response.json()) as T;
  } catch (error) {
    // Use showFailureToast for consistent error reporting
    await showFailureToast(error, {
      title: "API Request Failed",
    });
    // Re-throw the error to be caught by the calling command
    throw error;
  }
}

// Tag type is now defined in src/types/types.ts

/**
 * Fetches all tags defined in the n8n instance.
 */
export async function getAllTagsAPI(): Promise<Tag[]> {
  // Assuming endpoint /api/v1/tags and response { data: Tag[] }
  try {
    // n8n might return { tags: Tag[] } or { data: Tag[] } - adjust based on actual API
    // Let's assume { data: Tag[] } for now based on other endpoints
    const response = await fetchN8nApi<{ data: Tag[] }>("tags");
    return response.data || []; // Return empty array if data is missing
  } catch (error) {
    // Show a toast, but allow the command to proceed without tags
    await showFailureToast(error, {
      title: "Could not load tags",
    });
    return []; // Return empty array on error so the command doesn't completely break
  }
}

// --- API Functions ---

export async function getAllWorkflowsAPI(): Promise<Workflow[]> {
  // According to docs, the response is { data: Workflow[] }
  const response = await fetchN8nApi<{ data: Workflow[] }>("workflows");
  return response.data || []; // Return empty array if data is missing
}

export async function activateWorkflowAPI(id: string, active: boolean): Promise<void> {
  const endpoint = `workflows/${id}/${active ? "activate" : "deactivate"}`;
  await fetchN8nApi<Record<string, never>>(endpoint, { method: "POST" }); // Expecting no content on success
}

// Optional: Add executeWorkflowAPI if needed later
// export async function executeWorkflowAPI(id: string): Promise<any> {
//   // Endpoint might be /workflows/{id}/run or similar - check docs
//   // const response = await fetchN8nApi<any>(`workflows/${id}/run`, { method: "POST" });
//   // return response;
//   // throw new Error("Execute workflow API not implemented yet.");
// }

/**
 * Triggers a specific webhook URL.
 * Note: This does NOT use the n8n API key header, as webhooks are typically public or use different auth.
 */
export async function triggerWebhook(
  webhookUrl: string,
  method: string,
  headers?: Record<string, string>,
  body?: string // Body is passed as a string (e.g., JSON stringified)
): Promise<{ ok: boolean; status: number; body: string }> {
  const options: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      // Add default headers if needed, e.g., User-Agent
      ...headers, // User-provided headers override defaults
    },
  };

  // Only add body and Content-Type for relevant methods
  if (body && ["POST", "PUT", "PATCH"].includes(options.method || "")) {
    options.body = body;
    // Set Content-Type if not already provided by user
    if (!options.headers || !(options.headers as Record<string, string>)["Content-Type"]) {
      (options.headers as Record<string, string>)["Content-Type"] = "application/json"; // Default to JSON
    }
  }

  try {
    // Use global fetch
    const response: Response = await fetch(webhookUrl, options);
    // const response = fetchResult.response; // No longer needed
    const responseBody = await response.text(); // Get raw response body
    return {
      ok: response.ok ?? false,
      status: response.status ?? 500,
      body: responseBody,
    };
  } catch (error) {
    // Use showFailureToast for consistent error reporting
    await showFailureToast(error, {
      title: "Webhook Request Failed",
    });
    // Re-throw or return a specific error structure
    throw error;
  }
}
