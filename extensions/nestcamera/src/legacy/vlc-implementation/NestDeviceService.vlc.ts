/**
 * @deprecated This file contains the legacy VLC implementation for streaming Nest camera feeds.
 * Preserved for reference. Use WebRTC-based implementation instead.
 */

import { showToast, Toast, open } from "@raycast/api";
import { exec, ChildProcess } from "child_process";
import fs from "fs";

export class NestDeviceServiceVLC {
  private rtspSimpleServerProcess: ChildProcess | null = null;

  private async checkVlcInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
      fs.access(vlcPath, fs.constants.X_OK, (err) => {
        if (err) {
          console.error('VLC not found at:', vlcPath, err);
          resolve(false);
        } else {
          console.log('VLC found at:', vlcPath);
          resolve(true);
        }
      });
    });
  }

  private async startRtspSimpleServer(): Promise<void> {
    // Implementation removed as it's not needed in the legacy file
    // This is just a stub to fix the linter error
    return Promise.resolve();
  }

  private async generateStreamUrl(deviceId: string): Promise<{ url: string }> {
    // Implementation removed as it's not needed in the legacy file
    // This is just a stub to fix the linter error
    return Promise.resolve({ url: '' });
  }

  private async stopRtspSimpleServer(): Promise<void> {
    if (this.rtspSimpleServerProcess) {
      console.log('Stopping rtsp-simple-server...');
      this.rtspSimpleServerProcess.kill();
      this.rtspSimpleServerProcess = null;
      
      // Add a delay to ensure the port is released
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('rtsp-simple-server stopped.');
    }

    // Kill any other MediaMTX processes that might be running
    try {
      const { spawn } = require('child_process');
      spawn('pkill', ['-f', 'mediamtx']);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('No existing MediaMTX processes found');
    }
  }

  public async openCameraStream(deviceId: string, options: { pipMode?: boolean } = {}): Promise<void> {
    try {
      // Check if VLC is installed
      if (!await this.checkVlcInstalled()) {
        showToast({
          style: Toast.Style.Failure,
          title: "VLC Not Found",
          message: "Please install VLC Media Player to view camera streams",
          primaryAction: {
            title: "Install VLC",
            onAction: () => open("https://www.videolan.org/vlc/")
          }
        });
        return;
      }

      // Start the RTSP proxy server
      await this.startRtspSimpleServer();

      // Generate the stream URL from Nest
      const { url } = await this.generateStreamUrl(deviceId);
      
      // Set the source URL for MediaMTX
      process.env.NEST_SOURCE_URL = url;

      // Launch VLC with the stream URL using the direct path
      const vlcPath = '/Applications/VLC.app/Contents/MacOS/VLC';
      const vlcCommand = [
        `"${vlcPath}"`,  // Use direct path and quote it for safety
        'rtsp://127.0.0.1:8554/camera',
        '--no-video-title-show',
        '--rtsp-tcp'
      ];
      
      if (options.pipMode) {
        vlcCommand.push('--video-on-top', '--video-wallpaper');
      }

      const command = vlcCommand.join(' ');
      console.log('Executing VLC command:', command);

      exec(command, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          console.error('Failed to start VLC:', {
            error: error.message,
            stdout,
            stderr
          });
          throw error;
        }
        if (stderr) {
          console.log('VLC stderr:', stderr);
        }
        if (stdout) {
          console.log('VLC stdout:', stdout);
        }
      });

      showToast({
        style: Toast.Style.Success,
        title: "Opening Stream",
        message: "Starting camera stream in VLC..."
      });
    } catch (error) {
      console.error('Failed to open camera stream:', error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Stream",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }
}
