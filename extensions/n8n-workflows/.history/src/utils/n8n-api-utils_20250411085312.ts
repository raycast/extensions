import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { FetchError, Response } from "node-fetch";
import { Workflow } from "../types/types";

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
  options: RequestInit = {}
): Promise<T> {
  const { instanceUrl, apiKey } = getAPICredentials();

  // Ensure URL doesn't end with a slash and endpoint doesn't start with one
  const baseUrl = instanceUrl.endsWith('/') ? instanceUrl.slice(0, -1) : instanceUrl;
  const apiEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const fullUrl = `${baseUrl}/api/v1/${apiEndpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>), // Assume existing headers are string records
    "Accept": "application/json",
    "X-N8N-API-KEY": apiKey,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response: Response = await fetch(fullUrl, {
      ...options,
      headers: headers,
    });

    if (!response.ok) {
      let errorBody = "Unknown error";
      try {
        // Try to parse error details from n8n response
        const errorJson = await response.json() as { message?: string; error?: string };
        errorBody = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch (parseError) {
        // Fallback if parsing fails
        errorBody = await response.text();
      }
      console.error(`n8n API Error (${response.status}): ${errorBody}`);
      throw new Error(`HTTP error ${response.status}: ${errorBody}`);
    }

    // Handle cases where response might be empty (e.g., 204 No Content for activation)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T; // Return an empty object or appropriate type for no content
    }

    return (await response.json()) as T;

  } catch (error) {
    console.error("Error fetching n8n API:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "API Request Failed",
      message: error instanceof Error ? error.message : String(error),
    });
    // Re-throw the error to be caught by the calling command
    throw error;
  }
}

// --- API Functions ---

export async function getAllWorkflowsAPI(): Promise<Workflow[]> {
  // According to docs, the response is { data: Workflow[] }
  const response = await fetchN8nApi<{ data: Workflow[] }>("workflows");
  return response.data || []; // Return empty array if data is missing
}

export async function activateWorkflowAPI(id: string, active: boolean): Promise<void> {
  const endpoint = `workflows/${id}/${active ? 'activate' : 'deactivate'}`;
  await fetchN8nApi<Record<string, never>>(endpoint, { method: "POST" }); // Expecting no content on success
}

// Optional: Add executeWorkflowAPI if needed later
// export async function executeWorkflowAPI(id: string): Promise<any> {
//   // Endpoint might be /workflows/{id}/run or similar - check docs
//   // const response = await fetchN8nApi<any>(`workflows/${id}/run`, { method: "POST" });
//   // return response;
//   throw new Error("Execute workflow API not implemented yet.");
// }