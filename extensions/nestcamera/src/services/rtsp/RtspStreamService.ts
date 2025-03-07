import { NestDeviceService } from "../camera/NestDeviceService";
import { ProcessManager } from "../process/ProcessManager";
import { showToast, Toast } from "@raycast/api";

export enum StreamStatus {
  IDLE = "IDLE",
  STARTING = "STARTING",
  STREAMING = "STREAMING",
  ERROR = "ERROR",
  STOPPED = "STOPPED",
}

export class RtspStreamService {
  private static instance: RtspStreamService;
  private processManager: ProcessManager;
  private nestDeviceService: NestDeviceService;
  private streamStatus: Map<string, StreamStatus> = new Map();

  private constructor() {
    this.processManager = ProcessManager.getInstance();
    this.nestDeviceService = NestDeviceService.getInstance();
  }

  public static getInstance(): RtspStreamService {
    if (!RtspStreamService.instance) {
      RtspStreamService.instance = new RtspStreamService();
    }
    return RtspStreamService.instance;
  }

  public async startStream(deviceId: string, cameraName: string): Promise<void> {
    try {
      // Update status
      this.streamStatus.set(deviceId, StreamStatus.STARTING);

      // Show toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Stream",
        message: `Preparing stream for ${cameraName}...`,
      });

      // Get RTSP URL
      const rtspUrl = await this.nestDeviceService.getRtspUrl(deviceId);
      if (!rtspUrl) {
        throw new Error(`Failed to get RTSP URL for camera ${cameraName}`);
      }

      // Start the stream using ProcessManager
      await this.processManager.startRtspStream(deviceId, rtspUrl, cameraName);

      // Update status
      this.streamStatus.set(deviceId, StreamStatus.STREAMING);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Stream Started",
        message: `Now playing ${cameraName}`,
      });
    } catch (error) {
      // Update status
      this.streamStatus.set(deviceId, StreamStatus.ERROR);

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while starting stream";
      console.error(`Error starting stream for camera ${cameraName}:`, error);

      // Show error toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Stream Error",
        message: errorMessage,
      });

      throw new Error(`Failed to start stream for ${cameraName}: ${errorMessage}`);
    }
  }

  public async stopStream(deviceId: string): Promise<void> {
    try {
      // Update status
      this.streamStatus.set(deviceId, StreamStatus.STOPPED);

      // Stop the stream using ProcessManager
      await this.processManager.stopStream(deviceId);

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Stream Stopped",
        message: "Camera stream has been stopped",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while stopping stream";
      console.error(`Error stopping stream for device ${deviceId}:`, error);

      // Update status to error
      this.streamStatus.set(deviceId, StreamStatus.ERROR);

      // Show error toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Stopping Stream",
        message: errorMessage,
      });

      throw new Error(`Failed to stop stream: ${errorMessage}`);
    }
  }

  public getStreamStatus(deviceId: string): StreamStatus {
    return this.streamStatus.get(deviceId) || StreamStatus.IDLE;
  }

  public async cleanup(): Promise<void> {
    console.log("RtspStreamService: Starting cleanup...");

    try {
      // Clean up all processes
      await this.processManager.cleanup();

      // Reset all stream statuses
      this.streamStatus.clear();

      console.log("RtspStreamService: Cleanup completed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred during cleanup";
      console.error("Error during RtspStreamService cleanup:", error);
      throw new Error(`Failed to cleanup RtspStreamService: ${errorMessage}`);
    }
  }
}
