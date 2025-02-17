import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit as FetchRequestInit, Response as FetchResponse } from "node-fetch";

// API Preferences type
export interface MuteDeckPreferences {
  apiEndpoint: string;
  statusRefreshInterval: string;
  showToasts: boolean;
  confirmMuteInPresentation: boolean;
  confirmVideoInPresentation: boolean;
  confirmLeave: boolean;
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
async function fetchWithTimeout(url: URL, options: FetchRequestInit = {}, timeout = 5000): Promise<FetchResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal as unknown as AbortSignal,
    });

    if (response.status >= 200 && response.status < 300) {
      return response;
    }
    throw new MuteDeckError(`HTTP error! status: ${response.status}`, response.status);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MuteDeckError("Request timed out");
    }
    if (error instanceof MuteDeckError) {
      throw error;
    }
    throw new MuteDeckError(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(id);
  }
}

// API Actions
async function makeApiCall(path: ApiPath, method: "GET" | "POST" = "GET"): Promise<FetchResponse> {
  try {
    const url = getValidatedEndpoint(path);
    return await fetchWithTimeout(url, { method });
  } catch (error) {
    throw new MuteDeckError(
      `Failed to call ${path}: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}

export async function getStatus(): Promise<MuteDeckStatus> {
  try {
    const response = await makeApiCall("/v1/status");
    const data = (await response.json()) as MuteDeckStatus;
    return data;
  } catch (error) {
    throw new MuteDeckError(
      `Failed to get MuteDeck status: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof MuteDeckError ? error.code : undefined,
    );
  }
}

export async function toggleMute(): Promise<void> {
  await makeApiCall("/v1/mute", "POST");
}

export async function toggleVideo(): Promise<void> {
  await makeApiCall("/v1/video", "POST");
}

export async function leaveMeeting(): Promise<void> {
  await makeApiCall("/v1/leave", "POST");
}

// Helper Functions
export function isMuteDeckRunning(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.status >= 200 && status.status < 300;
}

export function isInMeeting(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.call === "active";
}

export function isMuted(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.mute === "active";
}

export function isVideoOn(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.video === "active";
}

export function isPresenting(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.share === "active";
}

export function isRecording(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return status.record === "active";
}
