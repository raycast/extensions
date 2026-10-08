import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ApiRoute, PageRoute } from "./types";

const DEFAULT_PORT = 9453;

// Flag to avoid showing toast multiple times for invalid port
let hasShownInvalidPortToast = false;

function getBaseUrl(): string {
  const { nextLensPort } = getPreferenceValues();

  // If not set or empty, use default
  if (!nextLensPort || nextLensPort.trim() === "") {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const parsed = parseInt(nextLensPort.trim(), 10);

  // Validate: must be a number between 1 and 65535
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    if (!hasShownInvalidPortToast) {
      hasShownInvalidPortToast = true;
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid next-lens Port",
        message: `"${nextLensPort}" is not a valid port. Using default ${DEFAULT_PORT}.`,
      });
    }
    return `http://localhost:${DEFAULT_PORT}`;
  }

  return `http://localhost:${parsed}`;
}

export class NextLensError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "NextLensError";
  }
}

async function fetchFromNextLens<T>(endpoint: string): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new NextLensError(`Failed to fetch from next-lens: ${response.statusText}`, response.status);
  }

  const data = await response.json();
  return data as T;
}

export async function fetchApiRoutes(): Promise<ApiRoute[]> {
  return fetchFromNextLens<ApiRoute[]>("/api/routes");
}

export async function fetchPageRoutes(): Promise<PageRoute[]> {
  return fetchFromNextLens<PageRoute[]>("/api/pages");
}
