import ky, { type KyInstance } from "ky";

import { CURRENT_BASE_URL, CURRENT_PAT, CURRENT_APP_TYPE } from "@/constants";
import { writeResponseFile } from "@/utils";
import type { AppType } from "@/types";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type RequestParams = {
  method: Method;
  url: string;
  params?: Record<string, unknown>;
  acceptHtml?: boolean;
};

export async function confluenceRequest<T>(params: RequestParams): Promise<T | null> {
  return apiRequest(params);
}

export async function jiraRequest<T>(params: RequestParams): Promise<T | null> {
  return apiRequest(params);
}

function createKyInstance(baseURL: string, appType: AppType): KyInstance {
  return ky.create({
    prefixUrl: baseURL,
    timeout: 30000,
    retry: 0,
    headers: {
      Authorization: `Bearer ${CURRENT_PAT}`,
      Accept: "application/json",
    },
    hooks: {
      beforeRequest: [
        (request) => {
          console.log("🚀 ~ Request:", request.method, request.url);
        },
      ],
      afterResponse: [
        async (request, _options, response) => {
          const acceptHeader = request.headers.get("accept") || "";
          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("text/html") && acceptHeader.includes("application/json")) {
            throw new Error(
              `Service not found (404): API endpoint returned HTML instead of JSON. This endpoint may not be supported. (${request.method} ${request.url})`,
            );
          }

          if (!response.ok) {
            let errorMessage = "";
            try {
              if (contentType.includes("application/json")) {
                const errorBody = await response.json();
                errorMessage = extractErrorMessage(errorBody);
              }
            } catch {
              // Ignore parsing errors
            }

            const statusMessages = {
              400: `Request failed (400): May contain invalid parameters. Please check your search and try again.`,
              401: `Authentication failed (401): Invalid or expired PAT. Please check your ${appType} preferences.`,
              403: `Access denied (403): Insufficient permissions. Contact your administrator.`,
              404: `Service not found (404): Incorrect or unreachable URL. Please check your ${appType} preferences.`,
              429: `Too many requests (429): Rate limit exceeded. Please wait and try again.`,
              500: `Server error (500): Service temporarily unavailable. Please try again later.`,
            };

            const baseMessage =
              statusMessages[response.status as keyof typeof statusMessages] ||
              `Request failed (${response.status}): Unexpected error. Please try again later.`;

            const fullMessage = errorMessage ? `${baseMessage} Details: ${errorMessage}` : baseMessage;
            throw new Error(`${fullMessage} (${request.method} ${request.url})`);
          }

          if (response.status === 204 && request.method === "GET") {
            throw new Error(
              `No data received (204): Empty response, likely network issues. Please check your connection and try again. (${request.method} ${request.url})`,
            );
          }

          return response;
        },
      ],
    },
  });
}

const kyInstance = createKyInstance(CURRENT_BASE_URL, CURRENT_APP_TYPE);

export async function apiRequest<T>({ method, url, params, acceptHtml = false }: RequestParams): Promise<T | null> {
  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;
  const options = {
    method,
    headers: { Accept: acceptHtml ? "text/html" : "application/json" },
    ...(method === "GET" || method === "DELETE"
      ? { searchParams: params as Record<string, string | number | boolean> }
      : { json: params }),
  };

  const response = await kyInstance(normalizedUrl, options);

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    return (await response.text()) as T;
  }

  return await response.json<T>();
}

type HandleApiResponseParams<T> = {
  data: T | null;
  fileName: string;
  defaultValue: T;
};

export function handleApiResponse<T>({ data, fileName: filename, defaultValue }: HandleApiResponseParams<T>): T {
  if (!data) return defaultValue;

  writeResponseFile(JSON.stringify(data, null, 2), filename);
  return data;
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

function extractErrorMessage(errorBody: unknown): string {
  if (typeof errorBody !== "object" || !errorBody) {
    return "";
  }

  const body = errorBody as Record<string, unknown>;

  // Jira/Atlassian API error format
  if (body.errorMessages && Array.isArray(body.errorMessages)) {
    return body.errorMessages.join("; ");
  }

  // Standard error message
  if (body.message && typeof body.message === "string") {
    return body.message;
  }

  // Nested error object
  if (body.error) {
    if (typeof body.error === "string") {
      return body.error;
    }
    if (typeof body.error === "object" && body.error && "message" in body.error) {
      return String(body.error.message);
    }
  }

  return "";
}
