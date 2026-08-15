import { getPreferenceValues } from "@raycast/api";
import { CreateVisualRequest, VisualStatusResponse, ApiError } from "./types";

const API_BASE_URL = "https://api.napkin.ai/v1";

function getApiKey(): string {
  const { napkinApiKey } = getPreferenceValues<Preferences>();
  return napkinApiKey;
}

async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `API Error: ${response.status}`;

  try {
    const text = await response.text();
    try {
      const errorData = JSON.parse(text) as ApiError;
      errorMessage = errorData.message || errorMessage;

      if (response.status === 429 && errorData.retry_after) {
        errorMessage = `Rate limit exceeded. Try again in ${errorData.retry_after}s.`;
      }
    } catch {
      // Response is not JSON, use text directly
      errorMessage = text || errorMessage;
    }
  } catch {
    // Failed to read response body
  }

  switch (response.status) {
    case 400:
      throw new Error(`Bad Request: ${errorMessage}`);
    case 401:
      throw new Error("Invalid API Key. Please check your extension preferences.");
    case 402:
    case 403:
      if (errorMessage.toLowerCase().includes("credit")) {
        throw new Error("No credits remaining. Please add credits at app.napkin.ai");
      }
      throw new Error(errorMessage);
    case 410:
      throw new Error("Request has expired. Please try again.");
    case 429:
      throw new Error(errorMessage);
    default:
      if (response.status >= 500) {
        throw new Error("Napkin API Server Error. Please try again later.");
      }
      throw new Error(errorMessage);
  }
}

export async function createVisualRequest(payload: CreateVisualRequest): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/visual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function checkRequestStatus(requestId: string): Promise<VisualStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/visual/${requestId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json() as Promise<VisualStatusResponse>;
}

export async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return response.arrayBuffer();
}

const POLL_INTERVAL_START = 1000;
const POLL_INTERVAL_MAX = 10000;
const POLL_TIMEOUT = 120000;

export async function pollForCompletion(requestId: string, onPending?: () => void): Promise<VisualStatusResponse> {
  const startTime = Date.now();
  let interval = POLL_INTERVAL_START;

  while (Date.now() - startTime < POLL_TIMEOUT) {
    const status = await checkRequestStatus(requestId);

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new Error(status.error?.message || "Visual generation failed.");
    }

    onPending?.();
    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.5, POLL_INTERVAL_MAX);
  }

  throw new Error("Visual generation timed out. Please try again.");
}
