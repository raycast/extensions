import { getConfig } from "../../utils/config";
import { OAuthManager } from "../auth/OAuthManager";
import {
  NestCamera,
  RtspStreamResponse,
  NestDeviceData,
  NestDeviceListResponse,
  NestParentRelation,
} from "../../types";
import { showToast, Toast, open } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import { NEST_API_ENDPOINT } from "../../constants";
import { RtspStreamService } from "../rtsp/RtspStreamService";

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
): Promise<T> {
  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < config.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (error instanceof Error && (error.message.includes("Rate limited") || error.message.includes("429"))) {
        const delay = Math.min(config.baseDelay * Math.pow(2, retryCount), config.maxDelay);
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }

      // If it's not a rate limit error, throw immediately
      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

const DEVICE_ACCESS_CONSOLE = "https://console.nest.google.com/device-access";

export class NestDeviceService {
  private static instance: NestDeviceService;
  private projectId: string;
  private deviceListCache: {
    devices: NestCamera[];
    timestamp: number;
  } | null = null;
  private static readonly CACHE_TTL = 60000; // 1 minute cache TTL
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    const config = getConfig();
    this.projectId = config.projectId.startsWith("enterprises/") ? config.projectId : `enterprises/${config.projectId}`;
  }

  public static getInstance(): NestDeviceService {
    if (!NestDeviceService.instance) {
      NestDeviceService.instance = new NestDeviceService();
    }
    return NestDeviceService.instance;
  }

  private async getHeaders(): Promise<Headers> {
    const authManager = OAuthManager.getInstance();
    const token = await authManager.getValidToken();

    return new Headers({
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    });
  }

  private handleError(error: unknown, operation: string): never {
    console.error(`Error during ${operation}:`, error);

    let message = error instanceof Error ? error.message : "Unknown error occurred";
    let title = `Failed to ${operation}`;
    let showConsoleLink = false;

    // Check if it's a project ID related error
    if (message.includes("Enterprise enterprises/") && message.includes("not found")) {
      title = "Invalid Project ID";
      message = "Please check your Project ID in the Device Access Console";
      showConsoleLink = true;
    }
    // Check if it's a permissions error
    else if (message.includes("permission") || message.includes("unauthorized") || message.includes("forbidden")) {
      title = "Permission Error";
      message = "Please check your OAuth scopes and Device Access permissions";
      showConsoleLink = true;
    }

    showToast({
      style: Toast.Style.Failure,
      title,
      message,
      primaryAction: showConsoleLink
        ? {
            title: "Open Device Access Console",
            onAction: () => open(DEVICE_ACCESS_CONSOLE),
          }
        : undefined,
    });

    throw error;
  }

  public async listCameras(): Promise<NestCamera[]> {
    // Check cache first
    if (this.deviceListCache && Date.now() - this.deviceListCache.timestamp < NestDeviceService.CACHE_TTL) {
      console.log("Returning cached device list");
      return this.deviceListCache.devices;
    }

    return retryWithExponentialBackoff(
      async () => {
        const headers = await this.getHeaders();
        const response = await fetch(`${NEST_API_ENDPOINT}/${this.projectId}/devices`, {
          headers,
          method: "GET",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            endpoint: `${NEST_API_ENDPOINT}/${this.projectId}/devices`,
          });

          if (response.status === 429) {
            throw new Error(`Rate limited: ${errorData.error?.message || "Too many requests"}`);
          }

          throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received devices response:", {
          hasDevices: !!data.devices,
          deviceCount: data.devices?.length || 0,
        });

        if (!data.devices || data.devices.length === 0) {
          this.deviceListCache = { devices: [], timestamp: Date.now() };
          return [];
        }

        const cameras = this.parseCamerasFromResponse(data);
        this.deviceListCache = { devices: cameras, timestamp: Date.now() };
        return cameras;
      },
      {
        maxRetries: 5,
        baseDelay: 30000, // Start with 30 seconds
        maxDelay: 300000, // Max 5 minutes
      },
    );
  }

  public async getCameraDetails(deviceId: string): Promise<NestCamera> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}`, {
        headers,
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          projectId: this.projectId,
          endpoint: `${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}`,
        });
        throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseCameraFromResponse(data);
    } catch (error) {
      this.handleError(error, "fetch camera details");
    }
  }

  private parseCamerasFromResponse(data: NestDeviceListResponse): NestCamera[] {
    if (!data.devices) {
      return [];
    }

    return data.devices
      .filter((device) => device.type === "sdm.devices.types.CAMERA")
      .map((device) => this.parseCameraFromResponse(device));
  }

  private parseCameraFromResponse(data: NestDeviceData): NestCamera {
    const traits = data.traits || {};
    const info = traits["sdm.devices.traits.Info"] || {};
    const connectivity = traits["sdm.devices.traits.Connectivity"] || {};
    const liveStream = traits["sdm.devices.traits.CameraLiveStream"] || {};

    // Log full traits for debugging
    console.log("Camera full traits:", {
      deviceName: info.customName || data.name,
      traits: JSON.stringify(traits, null, 2),
    });

    // Log streaming protocols for debugging
    console.log("Camera streaming protocols:", {
      deviceName: info.customName || data.name,
      protocols: liveStream.supportedProtocols || [],
    });

    // Check streaming protocols with explicit case handling
    const protocols = (liveStream.supportedProtocols || []).map((p: string) => p.toLowerCase());
    console.log("Normalized protocols:", protocols);

    const hasWebRTC = protocols.includes("web_rtc") || protocols.includes("webrtc");
    const hasRTSP = protocols.includes("rtsp");

    let streamingSupport: "WEB_RTC" | "RTSP" | "NONE" = "NONE";
    if (hasWebRTC) streamingSupport = "WEB_RTC";
    else if (hasRTSP) streamingSupport = "RTSP";

    // Log the streaming support decision for debugging
    console.log("Streaming support decision:", {
      deviceName: info.customName || data.name,
      originalProtocols: liveStream.supportedProtocols || [],
      normalizedProtocols: protocols,
      hasWebRTC,
      hasRTSP,
      finalDecision: streamingSupport,
    });

    // Extract room ID from assignee if available
    let roomHint = "";
    if (data.assignee) {
      // Try to extract a more user-friendly room name
      const parentInfo = data.parentRelations?.find(
        (rel: NestParentRelation) => rel.displayName && rel.displayName !== info.customName,
      );
      if (parentInfo && parentInfo.displayName) {
        roomHint = parentInfo.displayName;
      } else {
        // If no parent relation with display name, use a simplified room ID
        const roomId = data.assignee.split("/rooms/")?.[1]?.split("/")?.[0];
        if (roomId) {
          // Take just the first 8 characters of the ID to make it more readable
          roomHint = `Room ${roomId.substring(0, 8)}...`;
        }
      }
    }

    return {
      id: data.name.split("/").pop() || "",
      name: info.customName || "Unknown Camera",
      roomHint: roomHint,
      traits: {
        online: connectivity.status !== "OFFLINE",
        streamingSupport,
      },
    };
  }

  private startMonitoring(): void {
    const pollInterval = 300000; // Poll every 5 minutes
    const minPollInterval = 60000; // Minimum 1 minute between polls
    let lastPollTime = 0;
    let backoffDelay = pollInterval;

    // Clear any existing monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    const poll = async () => {
      try {
        const now = Date.now();
        if (now - lastPollTime < minPollInterval) {
          console.log("Skipping poll due to rate limit, waiting for backoff...");
          return;
        }

        lastPollTime = now;
        // Just call listCameras to refresh the cache, but we don't need to use the result
        await this.listCameras();

        // Reset backoff on successful poll
        backoffDelay = pollInterval;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Rate limited")) {
            console.log("Rate limited, increasing backoff delay...");
            backoffDelay = Math.min(backoffDelay * 2, 1800000); // Max 30 minutes
          } else {
            console.error("Error during camera polling:", error);
          }
        }
      }

      if (this.monitoringInterval) {
        // Use setTimeout for the next poll
        this.monitoringInterval = setTimeout(poll, backoffDelay) as unknown as NodeJS.Timeout;
      }
    };

    // Initial poll with a larger delay to avoid rate limits during startup
    this.monitoringInterval = setTimeout(poll, 30000) as unknown as NodeJS.Timeout; // Start first poll after 30 seconds
  }

  public async openStream(deviceId: string): Promise<void> {
    try {
      // Get camera details to get the name
      const camera = await this.getCameraDetails(deviceId);

      if (!camera.traits.online) {
        throw new Error("Camera is offline");
      }

      if (camera.traits.streamingSupport !== "RTSP") {
        throw new Error("Camera does not support RTSP streaming");
      }

      // Use the RtspStreamService to start the stream
      const rtspService = RtspStreamService.getInstance();
      await rtspService.startStream(deviceId, camera.name);
    } catch (error) {
      console.error("Error opening stream:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Stream Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  public async getRtspStreamUrl(deviceId: string): Promise<RtspStreamResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}:executeCommand`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          command: "sdm.devices.commands.CameraLiveStream.GenerateRtspStream",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("RTSP Stream API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error?.message || `Failed to generate RTSP stream: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.results.streamUrls.rtspUrl,
        expirationTime: new Date(data.results.expirationTime),
        extensionToken: data.results.streamToken,
      };
    } catch (error) {
      this.handleError(error, "generate RTSP stream");
    }
  }

  public async refreshRtspUrl(deviceId: string, extensionToken: string): Promise<RtspStreamResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}:executeCommand`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          command: "sdm.devices.commands.CameraLiveStream.ExtendRtspStream",
          params: {
            streamExtensionToken: extensionToken,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("RTSP Stream Extension API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error?.message || `Failed to extend RTSP stream: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.results.streamUrls.rtspUrl,
        expirationTime: new Date(data.results.expirationTime),
        extensionToken: data.results.streamToken,
      };
    } catch (error) {
      this.handleError(error, "extend RTSP stream");
    }
  }

  public async cleanup(): Promise<void> {
    console.log("NestDeviceService: Starting cleanup...");

    // Stop camera monitoring if active
    if (this.monitoringInterval) {
      console.log("NestDeviceService: Stopping camera monitoring");
      clearTimeout(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Clean up RTSP streams
    try {
      const rtspService = RtspStreamService.getInstance();
      console.log("NestDeviceService: Cleaning up RTSP service");
      await rtspService.cleanup();
    } catch (error) {
      console.error("NestDeviceService: Error cleaning up RTSP service:", error);
    }

    console.log("NestDeviceService: Cleanup completed");
  }

  /**
   * Gets the RTSP URL for a camera device
   * @param deviceId The device ID
   * @returns The RTSP URL
   */
  public async getRtspUrl(deviceId: string): Promise<string> {
    try {
      const camera = await this.getCameraDetails(deviceId);

      if (!camera.traits.online) {
        throw new Error("Camera is offline");
      }

      if (camera.traits.streamingSupport !== "RTSP") {
        throw new Error("Camera does not support RTSP streaming");
      }

      // Get RTSP URL with retries
      const rtspResponse = await retryWithExponentialBackoff(() => this.getRtspStreamUrl(deviceId), {
        maxRetries: 5,
        baseDelay: 60000, // Start with 1 minute delay
        maxDelay: 300000, // Max 5 minutes delay
      });

      console.log("Got RTSP stream URL:", {
        url: rtspResponse.url,
        expiresAt: rtspResponse.expirationTime,
      });

      return rtspResponse.url;
    } catch (error) {
      console.error("Error getting RTSP URL:", error);
      throw error;
    }
  }
}
