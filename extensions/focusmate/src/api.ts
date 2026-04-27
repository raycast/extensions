import { getPreferenceValues } from "@raycast/api";

const FOCUSMATE_API_URL = "https://api.focusmate.com/v1";

function getApiKey(): string {
  const preferences = getPreferenceValues<Preferences>();
  if (!preferences.apiKey) {
    throw new Error("API key not configured. Please set your Focusmate API key in Raycast preferences.");
  }
  return preferences.apiKey;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function fetchWithAuth<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const apiKey = getApiKey();
  const { params, ...fetchOptions } = options;

  let url = `${FOCUSMATE_API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "X-API-Key": apiKey,
      ...fetchOptions.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = JSON.parse(responseText)?.message;
    } catch {
      // non-JSON error body; fall back to status
    }
    throw new Error(message || `HTTP ${response.status}`);
  }

  return JSON.parse(responseText) as T;
}

export interface User {
  userId: string;
  name: string;
  totalSessionCount: number;
  timeZone: string;
  isFavorite?: boolean;
}

interface UserResponse {
  user: User;
}

export interface Session {
  sessionId: string;
  duration: number;
  startTime: string;
  users: User[];
}

export interface SessionsResponse {
  sessions: Session[];
}

export async function getProfile(): Promise<User> {
  const response = await fetchWithAuth<UserResponse>("/me");
  return response.user;
}

export async function getSessions(start?: string, end?: string): Promise<SessionsResponse> {
  const params: Record<string, string> = {};
  if (start) params.start = start;
  if (end) params.end = end;
  return fetchWithAuth<SessionsResponse>("/sessions", { params });
}
