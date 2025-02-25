import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit as FetchRequestInit, Response as FetchResponse } from "node-fetch";

// Constants
const MAX_TIMEOUT = 30000; // 30 seconds

// API Preferences type
export interface MuteDeckPreferences {
  apiEndpoint: string;
  statusRefreshInterval: string;
  showToasts: boolean;
  confirmMuteInPresentation: boolean;
  confirmVideoInPresentation: boolean;
  confirmLeave: boolean;
  apiTimeout: string;
}

// Export preferences getter
export const getPreferences = getPreferenceValues<MuteDeckPreferences>;

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

// Shared utility function
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

// Utility function to ensure valid timeout
function getValidTimeout(timeout: string): number {
  const parsed = Number(timeout);
  if (isNaN(parsed) || parsed <= 0) {
    return 5000;
  }
  return Math.min(parsed, MAX_TIMEOUT);
}

// Type validation utilities
function isValidActiveStatus(value: unknown): value is ActiveStatus {
  return value === "active" || value === "inactive";
}

function isValidFeatureStatus(value: unknown): value is FeatureStatus {
  return value === "active" || value === "inactive" || value === "disabled";
}

function isValidControlSystem(value: unknown): value is ControlSystem {
  return value === "system" || value === "zoom" || value === "webex" || value === "teams" || value === "google-meet";
}

interface StatusResponse {
  status: number;
}

function isStatusResponse(value: unknown): value is StatusResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as Record<string, unknown>).status === "number"
  );
}

function isValidMuteDeckStatus(value: unknown): value is MuteDeckStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;

  // Required fields
  if (typeof status.status !== "number") return false;
  if (!isValidActiveStatus(status.mute)) return false;
  if (!isValidFeatureStatus(status.video)) return false;
  if (!isValidFeatureStatus(status.share)) return false;
  if (!isValidFeatureStatus(status.record)) return false;

  // Optional fields
  if (status.call !== undefined && status.call !== "active") return false;
  if (status.control !== undefined && !isValidControlSystem(status.control)) return false;

  return true;
}

class MuteDeckClient {
  private static instance: MuteDeckClient;
  private readonly timeout: number;

  private constructor() {
    const { apiTimeout } = getPreferences();
    this.timeout = getValidTimeout(apiTimeout);
  }

  public static getInstance(): MuteDeckClient {
    if (!MuteDeckClient.instance) {
      MuteDeckClient.instance = new MuteDeckClient();
    }
    return MuteDeckClient.instance;
  }

  private getValidatedEndpoint(path: ApiPath): URL {
    const { apiEndpoint } = getPreferences();
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

  private async fetchWithTimeout(url: URL, options: FetchRequestInit = {}): Promise<FetchResponse> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
      });

      if (isSuccessStatus(response.status)) {
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

  private async makeApiCall(path: ApiPath, method: "GET" | "POST" = "GET"): Promise<FetchResponse> {
    try {
      const url = this.getValidatedEndpoint(path);
      return await this.fetchWithTimeout(url, { method });
    } catch (error) {
      throw new MuteDeckError(
        `Failed to call ${path}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof MuteDeckError ? error.code : undefined,
      );
    }
  }

  private async validateToggleResponse(response: FetchResponse): Promise<void> {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      // If there's no JSON body but status is success, that's fine
      return;
    }

    // If we got JSON, validate it has a success status
    if (isStatusResponse(data) && !isSuccessStatus(data.status)) {
      throw new MuteDeckError("Operation failed", data.status);
    }
  }

  public async getStatus(): Promise<MuteDeckStatus> {
    try {
      const response = await this.makeApiCall("/v1/status");

      let data: unknown;
      try {
        data = await response.json();
      } catch (error) {
        throw new MuteDeckError("Invalid JSON response from API");
      }

      if (!isValidMuteDeckStatus(data)) {
        throw new MuteDeckError("Invalid API response format");
      }

      return data;
    } catch (error) {
      throw new MuteDeckError(
        `Failed to get MuteDeck status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof MuteDeckError ? error.code : undefined,
      );
    }
  }

  public async toggleMute(): Promise<void> {
    const response = await this.makeApiCall("/v1/mute", "POST");
    await this.validateToggleResponse(response);
  }

  public async toggleVideo(): Promise<void> {
    const response = await this.makeApiCall("/v1/video", "POST");
    await this.validateToggleResponse(response);
  }

  public async leaveMeeting(): Promise<void> {
    const response = await this.makeApiCall("/v1/leave", "POST");
    await this.validateToggleResponse(response);
  }
}

// Export singleton instance
const client = MuteDeckClient.getInstance();

// Export API methods
export const getStatus = () => client.getStatus();
export const toggleMute = () => client.toggleMute();
export const toggleVideo = () => client.toggleVideo();
export const leaveMeeting = () => client.leaveMeeting();

// Helper Functions
export function isMuteDeckRunning(status: MuteDeckStatus | null | undefined): boolean {
  if (!status) return false;
  return isSuccessStatus(status.status);
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
