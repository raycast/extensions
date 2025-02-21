import { LocalStorage, showToast, Toast, environment } from "@raycast/api";
import { retryWithExponentialBackoff } from "../../utils/retry";
import { NEST_API_ENDPOINT } from "../../constants";
import { OAuthManager } from "../auth/OAuthManager";
import path from "path";

export interface WebRTCStreamResponse {
  answerSdp: string;
  mediaSessionId: string;
  expiresAt?: string;
}

export interface StreamUrlOptions {
  pipMode?: boolean;
  position?: WindowPosition;
}

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  display: number;
}

export class WebRTCStreamService {
  private static instance: WebRTCStreamService;
  private readonly projectId: string;

  private constructor(projectId: string) {
    this.projectId = projectId;
  }

  public static getInstance(projectId: string): WebRTCStreamService {
    if (!WebRTCStreamService.instance) {
      WebRTCStreamService.instance = new WebRTCStreamService(projectId);
    }
    return WebRTCStreamService.instance;
  }

  private logStreamEvent(event: string, data?: any): void {
    console.log(`[WebRTC Stream] ${event}`, data ? JSON.stringify(data, null, 2) : '');
  }

  private logStreamError(error: Error, context?: any): void {
    console.error(`[WebRTC Stream Error] ${error.message}`, {
      error,
      context: context ? JSON.stringify(context, null, 2) : undefined
    });
  }

  private async getHeaders(): Promise<Headers> {
    const authManager = OAuthManager.getInstance();
    const token = await authManager.getValidToken();

    return new Headers({
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    });
  }

  public async generateWebRtcStream(deviceId: string): Promise<WebRTCStreamResponse> {
    return retryWithExponentialBackoff(async () => {
      try {
        this.logStreamEvent('Generating WebRTC stream', { deviceId });
        
        const headers = await this.getHeaders();
        
        // Ensure deviceId has the full path format
        const fullDeviceId = deviceId.includes('enterprises/') 
          ? deviceId 
          : `${this.projectId}/devices/${deviceId}`;

        const response = await fetch(
          `${NEST_API_ENDPOINT}/${fullDeviceId}:executeCommand`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              command: 'sdm.devices.commands.CameraLiveStream.GenerateWebRtcStream'
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
          this.logStreamError(new Error(`Stream generation failed: ${response.statusText}`), {
            status: response.status,
            error: errorData,
            deviceId: fullDeviceId
          });
          
          if (response.status === 429) {
            throw new Error(`Rate limited: ${errorData.error?.message || 'Too many requests'}`);
          }
          throw new Error(`Failed to generate stream: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json() as {
          results?: {
            answerSdp?: string;
            mediaSessionId?: string;
            expiresAt?: string;
          };
        };
        
        this.logStreamEvent('Stream generation response', {
          hasResults: !!data.results,
          mediaSessionId: data.results?.mediaSessionId,
          expiresAt: data.results?.expiresAt
        });

        if (!data.results?.answerSdp || !data.results?.mediaSessionId) {
          throw new Error('Invalid stream response: Missing required fields');
        }

        // Store mediaSessionId for later use
        await LocalStorage.setItem(
          `stream_session_${deviceId}`,
          JSON.stringify({
            mediaSessionId: data.results.mediaSessionId,
            expiresAt: data.results.expiresAt
          })
        );

        return {
          answerSdp: data.results.answerSdp,
          mediaSessionId: data.results.mediaSessionId,
          expiresAt: data.results.expiresAt
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logStreamError(err, { deviceId });
        throw err;
      }
    }, {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 10000
    });
  }

  public async generateStreamUrl(deviceId: string, options: StreamUrlOptions = {}): Promise<string> {
    try {
      this.logStreamEvent('Generating stream URL', { deviceId, options });
      
      const streamResponse = await this.generateWebRtcStream(deviceId);
      
      // Create a URL-safe base64 encoded version of the SDP
      const encodedSdp = Buffer.from(streamResponse.answerSdp).toString('base64url');
      
      // Use file:// protocol to load our local HTML file
      const playerPath = path.join(environment.assetsPath, 'webrtc-player.html');
      const url = new URL(`file://${playerPath}`);
      
      // Add our parameters
      url.searchParams.set('sdp', encodedSdp);
      url.searchParams.set('session', streamResponse.mediaSessionId);
      if (streamResponse.expiresAt) {
        url.searchParams.set('expires', streamResponse.expiresAt);
      }
      
      if (options.pipMode) {
        url.searchParams.set('pip', 'true');
      }
      
      // Add position parameters if provided
      if (options.position) {
        url.searchParams.set('position', JSON.stringify(options.position));
      }

      this.logStreamEvent('Generated stream URL');
      return url.toString();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logStreamError(err, { deviceId, options });
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Generate Stream",
        message: err.message
      });
      
      throw err;
    }
  }

  public async extendStream(deviceId: string, mediaSessionId: string): Promise<void> {
    try {
      this.logStreamEvent('Extending stream session', { deviceId, mediaSessionId });
      
      const headers = await this.getHeaders();
      const fullDeviceId = deviceId.includes('enterprises/') 
        ? deviceId 
        : `${this.projectId}/devices/${deviceId}`;

      const response = await fetch(
        `${NEST_API_ENDPOINT}/${fullDeviceId}:executeCommand`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            command: 'sdm.devices.commands.CameraLiveStream.ExtendWebRtcStream',
            params: {
              mediaSessionId
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(`Failed to extend stream: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as {
        results?: {
          expiresAt?: string;
        };
      };
      
      this.logStreamEvent('Stream extension response', {
        success: true,
        newExpiresAt: data.results?.expiresAt
      });

      // Update stored session info
      await LocalStorage.setItem(
        `stream_session_${deviceId}`,
        JSON.stringify({
          mediaSessionId,
          expiresAt: data.results?.expiresAt
        })
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logStreamError(err, { deviceId, mediaSessionId });
      throw err;
    }
  }
} 