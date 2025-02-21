import { getConfig } from "../../utils/config";
import { OAuthManager } from "../auth/OAuthManager";
import { NestCamera, RtspStreamResponse, StreamOptions } from "../../types";
import { showToast, Toast, open, environment } from "@raycast/api";
import fetch, { Headers } from "node-fetch";
import { WebRTCStreamService } from "../webrtc/WebRTCStreamService";
import { NEST_API_ENDPOINT } from "../../constants";
import { RtspStreamService } from "../rtsp/RtspStreamService";
import { Clipboard } from "@raycast/api";

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
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < config.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a rate limit error
      if (error instanceof Error && 
          (error.message.includes('Rate limited') || 
           error.message.includes('429'))) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, retryCount),
          config.maxDelay
        );
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      
      // If it's not a rate limit error, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
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

  private constructor() {
    const config = getConfig();
    this.projectId = config.projectId.startsWith('enterprises/')
      ? config.projectId
      : `enterprises/${config.projectId}`;
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
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: unknown, operation: string): never {
    console.error(`Error during ${operation}:`, error);
    
    let message = error instanceof Error ? error.message : 'Unknown error occurred';
    let title = `Failed to ${operation}`;
    let showConsoleLink = false;

    // Check if it's a project ID related error
    if (message.includes('Enterprise enterprises/') && message.includes('not found')) {
      title = "Invalid Project ID";
      message = "Please check your Project ID in the Device Access Console";
      showConsoleLink = true;
    }
    // Check if it's a permissions error
    else if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      title = "Permission Error";
      message = "Please check your OAuth scopes and Device Access permissions";
      showConsoleLink = true;
    }
    
    showToast({
      style: Toast.Style.Failure,
      title,
      message,
      primaryAction: showConsoleLink ? {
        title: "Open Device Access Console",
        onAction: () => open(DEVICE_ACCESS_CONSOLE),
      } : undefined,
    });
    
    throw error;
  }

  public async listCameras(): Promise<NestCamera[]> {
    // Check cache first
    if (this.deviceListCache && 
        (Date.now() - this.deviceListCache.timestamp) < NestDeviceService.CACHE_TTL) {
      console.log('Returning cached device list');
      return this.deviceListCache.devices;
    }

    return retryWithExponentialBackoff(async () => {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${NEST_API_ENDPOINT}/${this.projectId}/devices`,
        { 
          headers,
          method: 'GET'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          endpoint: `${NEST_API_ENDPOINT}/${this.projectId}/devices`
        });

        if (response.status === 429) {
          throw new Error(`Rate limited: ${errorData.error?.message || 'Too many requests'}`);
        }

        throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received devices response:', {
        hasDevices: !!data.devices,
        deviceCount: data.devices?.length || 0
      });
      
      if (!data.devices || data.devices.length === 0) {
        this.deviceListCache = { devices: [], timestamp: Date.now() };
        return [];
      }
        
      const cameras = this.parseCamerasFromResponse(data);
      this.deviceListCache = { devices: cameras, timestamp: Date.now() };
      return cameras;
    }, {
      maxRetries: 5,
      baseDelay: 30000,  // Start with 30 seconds
      maxDelay: 300000   // Max 5 minutes
    });
  }

  public async getCameraDetails(deviceId: string): Promise<NestCamera> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}`,
        { 
          headers,
          method: 'GET'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          projectId: this.projectId,
          endpoint: `${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}`
        });
        throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseCameraFromResponse(data);
    } catch (error) {
      this.handleError(error, 'fetch camera details');
    }
  }

  private parseCamerasFromResponse(data: any): NestCamera[] {
    if (!data.devices) {
      return [];
    }

    return data.devices
      .filter((device: any) => device.type === "sdm.devices.types.CAMERA")
      .map((device: any) => this.parseCameraFromResponse(device));
  }

  private parseCameraFromResponse(data: any): NestCamera {
    const traits = data.traits || {};
    const info = traits['sdm.devices.traits.Info'] || {};
    const connectivity = traits['sdm.devices.traits.Connectivity'] || {};
    const liveStream = traits['sdm.devices.traits.CameraLiveStream'] || {};
    
    // Log full traits for debugging
    console.log('Camera full traits:', {
      deviceName: info.customName || data.name,
      traits: JSON.stringify(traits, null, 2)
    });
    
    // Log streaming protocols for debugging
    console.log('Camera streaming protocols:', {
      deviceName: info.customName || data.name,
      protocols: liveStream.supportedProtocols || []
    });
    
    // Check streaming protocols with explicit case handling
    const protocols = (liveStream.supportedProtocols || []).map((p: string) => p.toLowerCase());
    console.log('Normalized protocols:', protocols);
    
    const hasWebRTC = protocols.includes('web_rtc') || protocols.includes('webrtc');
    const hasRTSP = protocols.includes('rtsp');
    
    let streamingSupport: "WEB_RTC" | "RTSP" | "NONE" = "NONE";
    if (hasWebRTC) streamingSupport = "WEB_RTC";
    else if (hasRTSP) streamingSupport = "RTSP";
    
    // Log the streaming support decision for debugging
    console.log('Streaming support decision:', {
      deviceName: info.customName || data.name,
      originalProtocols: liveStream.supportedProtocols || [],
      normalizedProtocols: protocols,
      hasWebRTC,
      hasRTSP,
      finalDecision: streamingSupport
    });
    
    return {
      id: data.name.split('/').pop(),
      name: info.customName || data.parentRelations?.[0]?.displayName || data.name || 'Unknown Camera',
      roomHint: data.assignee?.split('/rooms/')?.[1]?.split('/')?.[0] || '',
      traits: {
        online: connectivity.status !== 'OFFLINE',
        streamingSupport
      }
    };
  }

  public async startCameraMonitoring(
    onCameraUpdate: (camera: NestCamera) => void,
    onError: (error: Error) => void
  ): Promise<() => void> {
    let isMonitoring = true;
    const pollInterval = 300000; // Poll every 5 minutes
    const minPollInterval = 60000; // Minimum 1 minute between polls
    let lastPollTime = 0;
    let consecutiveErrors = 0;
    let backoffDelay = pollInterval;

    const poll = async () => {
      try {
        const now = Date.now();
        if (now - lastPollTime < minPollInterval) {
          console.log('Skipping poll due to rate limit, waiting for backoff...');
          return;
        }

        lastPollTime = now;
        const cameras = await this.listCameras();
        cameras.forEach(onCameraUpdate);
        
        // Reset error count and backoff on successful poll
        consecutiveErrors = 0;
        backoffDelay = pollInterval;
      } catch (error) {
        if (error instanceof Error) {
          consecutiveErrors++;
          
          if (error.message.includes('Rate limited')) {
            console.log('Rate limited, increasing backoff delay...');
            backoffDelay = Math.min(backoffDelay * 2, 1800000); // Max 30 minutes
          } else {
            onError(error);
          }
        }
      }

      if (isMonitoring) {
        setTimeout(poll, backoffDelay);
      }
    };

    // Initial poll with a larger delay to avoid rate limits during startup
    setTimeout(poll, 30000); // Start first poll after 30 seconds

    // Return cleanup function
    return () => {
      isMonitoring = false;
    };
  }

  public async openCameraStream(deviceId: string, options: StreamOptions = {}): Promise<void> {
    try {
      const camera = await this.getCameraDetails(deviceId);
      
      if (!camera.traits.online) {
        throw new Error('Camera is offline');
      }

      switch (camera.traits.streamingSupport) {
        case "WEB_RTC": {
          const webrtcService = WebRTCStreamService.getInstance(this.projectId);
          const streamUrl = await webrtcService.generateStreamUrl(deviceId, {
            pipMode: options.pipMode
          });
          await open(streamUrl);
          break;
        }
        case "RTSP": {
          const rtspService = RtspStreamService.getInstance();
          
          // Get RTSP URL with retries
          const rtspResponse = await retryWithExponentialBackoff(
            () => this.getRtspStreamUrl(deviceId),
            {
              maxRetries: 5,
              baseDelay: 60000, // Start with 1 minute delay
              maxDelay: 300000  // Max 5 minutes delay
            }
          );
          
          // Start RTSP stream with FFmpeg transcoding to HLS
          console.log('Starting RTSP stream with response:', {
            url: rtspResponse.url,
            expiresAt: rtspResponse.expirationTime
          });
          
          console.log('Waiting for stream to start...');
          const streamStatus = await rtspService.startStream(deviceId, rtspResponse.url);
          
          console.log('Stream started successfully:', {
            isActive: streamStatus.isActive,
            pid: streamStatus.pid,
            url: streamStatus.url,
            error: streamStatus.error?.message,
            segmentCount: streamStatus.segmentCount,
            lastError: streamStatus.lastError
          });

          if (!streamStatus.isActive || !streamStatus.url) {
            throw new Error('Failed to start RTSP stream');
          }

          // Open the HLS stream URL directly in Safari
          try {
            console.log('Opening stream URL directly in Safari:', streamStatus.url);
            await open(streamStatus.url, "com.apple.Safari");
            console.log('Safari open command executed successfully');
          } catch (error) {
            console.error('Failed to open Safari:', error);
            console.log('Safari launch context:', {
              streamUrl: streamStatus.url,
              error: error instanceof Error ? error.message : String(error)
            });
            
            // Try alternative launch method
            try {
              console.log('Trying alternative Safari launch method...');
              await open(streamStatus.url);
              console.log('Alternative Safari launch successful');
            } catch (altError) {
              console.error('Alternative launch also failed:', altError);
              
              // Show error toast with URL for manual opening
              showToast({
                style: Toast.Style.Failure,
                title: "Failed to Open Safari",
                message: "Click to copy stream URL",
                primaryAction: {
                  title: "Copy URL",
                  onAction: () => {
                    Clipboard.copy(streamStatus.url);
                    showToast({
                      style: Toast.Style.Success,
                      title: "URL Copied",
                      message: "Paste in Safari to watch stream"
                    });
                  },
                },
              });
              
              throw error; // Throw original error
            }
          }

          // Set up token refresh before expiration
          let refreshAttempts = 0;
          const maxRefreshAttempts = 3;
          const refreshInterval = setInterval(async () => {
            try {
              // Calculate time until expiration
              const timeUntilExpiration = rtspResponse.expirationTime.getTime() - Date.now();
              
              // If more than 5 minutes until expiration, skip refresh
              if (timeUntilExpiration > 300000) {
                console.log('Skipping token refresh, plenty of time remaining:', 
                  Math.floor(timeUntilExpiration / 1000), 'seconds');
                return;
              }

              console.log('Attempting token refresh, attempts:', refreshAttempts + 1);
              
              // Add increasing delay between refresh attempts
              const refreshDelay = Math.min(60000 * Math.pow(2, refreshAttempts), 300000);
              await new Promise(resolve => setTimeout(resolve, refreshDelay));
              
              const newRtspResponse = await this.refreshRtspUrl(deviceId, rtspResponse.extensionToken);
              await rtspService.startStream(deviceId, newRtspResponse.url);
              
              // Reset attempts on success
              refreshAttempts = 0;
            } catch (error) {
              console.error('Failed to refresh RTSP stream:', error);
              refreshAttempts++;
              
              if (refreshAttempts >= maxRefreshAttempts) {
                console.error('Max refresh attempts reached, stopping refresh');
                clearInterval(refreshInterval);
                
                // Show warning toast to user
                showToast({
                  style: Toast.Style.Failure,
                  title: "Stream Refresh Failed",
                  message: "Unable to refresh stream due to rate limits. Please try again later."
                });
              }
            }
          }, 60000); // Check every minute

          break;
        }
        default:
          throw new Error('Camera does not support streaming');
      }
    } catch (error) {
      this.handleError(error, 'open camera stream');
    }
  }

  public async getRtspStreamUrl(deviceId: string): Promise<RtspStreamResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}:executeCommand`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            command: 'sdm.devices.commands.CameraLiveStream.GenerateRtspStream'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('RTSP Stream API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error?.message || `Failed to generate RTSP stream: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.results.streamUrls.rtspUrl,
        expirationTime: new Date(data.results.expirationTime),
        extensionToken: data.results.streamToken
      };
    } catch (error) {
      this.handleError(error, 'generate RTSP stream');
    }
  }

  public async refreshRtspUrl(deviceId: string, extensionToken: string): Promise<RtspStreamResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${NEST_API_ENDPOINT}/${this.projectId}/devices/${deviceId}:executeCommand`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            command: 'sdm.devices.commands.CameraLiveStream.ExtendRtspStream',
            params: {
              streamExtensionToken: extensionToken
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('RTSP Stream Extension API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error?.message || `Failed to extend RTSP stream: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.results.streamUrls.rtspUrl,
        expirationTime: new Date(data.results.expirationTime),
        extensionToken: data.results.streamToken
      };
    } catch (error) {
      this.handleError(error, 'extend RTSP stream');
    }
  }

  public async cleanup(): Promise<void> {
    const rtspService = RtspStreamService.getInstance();
    await rtspService.cleanup();
  }
}