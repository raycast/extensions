import {
  ApiError,
  MeetingsResponse,
  TranscriptResponse,
  HighlightsResponse,
} from "./types";
import {
  getMockMeetingsResponse,
  getMockTranscriptResponse,
  getMockHighlightsResponse,
  simulateDelay,
} from "./mock-data";

const API_BASE_URL = "https://pasta.tldv.io/v1alpha1";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generic API request with error handling and retries
async function apiRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: "GET",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Handle rate limiting with retry
    if (response.status === 429 && retries > 0) {
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_DELAY_MS;
      await sleep(delayMs);
      return apiRequest<T>(endpoint, apiKey, options, retries - 1);
    }

    throw new ApiError(
      `API error: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
    );
  }

  return (await response.json()) as T;
}

// Fetch meetings with pagination
export async function fetchMeetings(
  apiKey: string,
  page = 1,
  limit = 50,
  useMockData = false,
): Promise<MeetingsResponse> {
  if (useMockData) {
    await simulateDelay(300);
    return getMockMeetingsResponse(page, limit);
  }
  return apiRequest<MeetingsResponse>(
    `/meetings?page=${page}&limit=${limit}`,
    apiKey,
  );
}

// Fetch all meetings (with pagination handling)
export async function fetchAllMeetings(
  apiKey: string,
  limit = 50,
  maxPages = 10,
  onProgress?: (page: number, total: number) => void,
  useMockData = false,
): Promise<MeetingsResponse> {
  const firstPage = await fetchMeetings(apiKey, 1, limit, useMockData);
  let allResults = [...firstPage.results];

  const totalPages = Math.min(firstPage.pages, maxPages);

  if (onProgress) {
    onProgress(1, totalPages);
  }

  for (let page = 2; page <= totalPages; page++) {
    const pageData = await fetchMeetings(apiKey, page, limit, useMockData);
    allResults = [...allResults, ...pageData.results];

    if (onProgress) {
      onProgress(page, totalPages);
    }
  }

  return {
    ...firstPage,
    results: allResults,
    page: 1,
    pages: 1,
  };
}

// Fetch transcript
export async function fetchTranscript(
  apiKey: string,
  meetingId: string,
  useMockData = false,
): Promise<TranscriptResponse | null> {
  if (useMockData) {
    await simulateDelay(200);
    return getMockTranscriptResponse(meetingId);
  }
  try {
    return await apiRequest<TranscriptResponse>(
      `/meetings/${meetingId}/transcript`,
      apiKey,
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
}

// Fetch highlights
export async function fetchHighlights(
  apiKey: string,
  meetingId: string,
  useMockData = false,
): Promise<HighlightsResponse | null> {
  if (useMockData) {
    await simulateDelay(200);
    return getMockHighlightsResponse(meetingId);
  }
  try {
    return await apiRequest<HighlightsResponse>(
      `/meetings/${meetingId}/highlights`,
      apiKey,
    );
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
}

// Fetch meeting details (transcript + highlights)
export async function fetchMeetingDetails(
  apiKey: string,
  meetingId: string,
  useMockData = false,
): Promise<{
  transcript: TranscriptResponse | null;
  highlights: HighlightsResponse | null;
}> {
  const [transcriptResult, highlightsResult] = await Promise.allSettled([
    fetchTranscript(apiKey, meetingId, useMockData),
    fetchHighlights(apiKey, meetingId, useMockData),
  ]);

  return {
    transcript:
      transcriptResult.status === "fulfilled" ? transcriptResult.value : null,
    highlights:
      highlightsResult.status === "fulfilled" ? highlightsResult.value : null,
  };
}

// Validate API key
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await fetchMeetings(apiKey, 1, 1);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) {
      return false;
    }
    throw error;
  }
}

// Get user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return "Invalid API key. Please check your credentials.";
    }
    if (error.isRateLimited) {
      return "Rate limited. Please try again later.";
    }
    return `API error: ${error.status} - ${error.statusText}`;
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "Network error. Please check your internet connection.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
