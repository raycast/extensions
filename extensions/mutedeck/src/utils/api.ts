import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

// API Preferences type
export interface MuteDeckPreferences {
  apiEndpoint: string;
  statusRefreshInterval: string;
}

// Export preferences getter
export const getPreferences = getPreferenceValues<MuteDeckPreferences>;

// Cache preferences to avoid multiple calls
const preferences = getPreferences();

// API Response Types
export type CallStatus = "active";
export type ControlSystem = "system" | "zoom" | "webex" | "teams" | "google-meet";
export type ActiveStatus = "active" | "inactive";
export type FeatureStatus = "active" | "inactive" | "disabled";

export interface MuteDeckStatus {
  call?: CallStatus;
  control?: ControlSystem;
  mute: ActiveStatus;
  video: FeatureStatus;
  share: FeatureStatus;
  record: FeatureStatus;
  status: number;
}

// API Error Types
export class MuteDeckError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "MuteDeckError";
  }
}

export class MuteDeckTimeoutError extends MuteDeckError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "MuteDeckTimeoutError";
  }
}

export class MuteDeckConfigError extends MuteDeckError {
  constructor(message: string) {
    super(message);
    this.name = "MuteDeckConfigError";
  }
}

// API Path type
type ApiPath = "/v1/status" | "/v1/mute" | "/v1/video" | "/v1/leave";

// Validate and construct API endpoint URL
function getValidatedEndpoint(path: ApiPath): URL {
  const { apiEndpoint } = preferences;
  if (!apiEndpoint) {
    throw new MuteDeckConfigError("API endpoint is not configured");
  }
  try {
    const baseUrl = new URL(apiEndpoint);
    return new URL(path, baseUrl);
  } catch (error) {
    throw new MuteDeckConfigError(`Invalid API endpoint: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch with timeout
async function fetchWithTimeout(url: URL, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal,
    });

    if (response.status >= 200 && response.status < 300) {
      return response;
    }
    throw new MuteDeckError(`HTTP error! status: ${response.status}`, response.status);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MuteDeckTimeoutError();
    }
    if (error instanceof MuteDeckError) {
      throw error;
    }
    throw new MuteDeckError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(id);
  }
}

// API Methods
export async function getStatus(): Promise<MuteDeckStatus> {
  try {
    const url = getValidatedEndpoint("/v1/status");
    const response = await fetchWithTimeout(url);
    const data = (await response.json()) as MuteDeckStatus;
    return data;
  } catch (error) {
    throw new MuteDeckError(
      `Failed to get MuteDeck status: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}

// Helper Functions
export function isMuteDeckRunning(status: MuteDeckStatus): boolean {
  return status.status >= 200 && status.status < 300;
}

export function isInMeeting(status: MuteDeckStatus): boolean {
  return status.call === "active";
}

export function isMuted(status: MuteDeckStatus): boolean {
  return status.mute === "active";
}

export function isVideoOn(status: MuteDeckStatus): boolean {
  return status.video === "active";
}

export function isPresenting(status: MuteDeckStatus): boolean {
  return status.share === "active";
}

export function isRecording(status: MuteDeckStatus): boolean {
  return status.record === "active";
}

// API Actions
export async function toggleMute(): Promise<void> {
  try {
    const url = getValidatedEndpoint("/v1/mute");
    await fetchWithTimeout(url, { method: "POST" });
  } catch (error) {
    throw new MuteDeckError(
      `Failed to toggle mute: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}

export async function toggleVideo(): Promise<void> {
  try {
    const url = getValidatedEndpoint("/v1/video");
    await fetchWithTimeout(url, { method: "POST" });
  } catch (error) {
    throw new MuteDeckError(
      `Failed to toggle video: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}

export async function leaveMeeting(): Promise<void> {
  try {
    const url = getValidatedEndpoint("/v1/leave");
    await fetchWithTimeout(url, { method: "POST" });
  } catch (error) {
    throw new MuteDeckError(
      `Failed to leave meeting: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}
