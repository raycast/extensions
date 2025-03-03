import { spawn, ChildProcess } from "child_process";
import { environment, showToast, Toast, open } from "@raycast/api";
import { join } from "path";
import { existsSync } from "fs";

export interface StreamProcess {
  pid: number;
  deviceId: string;
  startTime: Date;
  process: ChildProcess;
}

/**
 * ProcessManager handles starting and stopping FFplay processes for RTSP streams.
 * It uses a singleton pattern to ensure only one instance exists.
 */
export class ProcessManager {
  private static instance: ProcessManager;
  private activeProcesses: Map<string, StreamProcess> = new Map();
  private scriptPath: string = "";
  private isCleaningUp: boolean = false;

  private constructor() {
    // Try to find the script in different locations
    // First check the assets directory (for production)
    const assetsScriptPath = join(environment.assetsPath, "scripts", "nest-player.sh");
    // Then check the src directory (for development)
    const devScriptPath = join(environment.supportPath, "..", "src", "scripts", "nest-player.sh");
    // Also check the direct src path
    const directSrcPath = join(process.cwd(), "src", "scripts", "nest-player.sh");

    // Set the script path based on what exists
    if (existsSync(assetsScriptPath)) {
      this.scriptPath = assetsScriptPath;
    } else if (existsSync(devScriptPath)) {
      this.scriptPath = devScriptPath;
    } else if (existsSync(directSrcPath)) {
      this.scriptPath = directSrcPath;
    } else {
      // Fallback to the original path
      this.scriptPath = join(environment.supportPath, "src", "scripts", "nest-player.sh");
    }

    console.log(`ProcessManager: Using script at ${this.scriptPath}`);

    // Register cleanup on process exit
    process.on("exit", () => this.cleanup());
    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
  }

  /**
   * Get the singleton instance of ProcessManager
   */
  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  /**
   * Execute a command and return a promise that resolves when the command completes
   * @param command The command to execute
   * @param args The arguments to pass to the command
   * @returns A promise that resolves when the command completes
   */
  private async executeCommand(
    command: string,
    args: string[]
  ): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      process.on("error", (error) => {
        stderr += error.toString();
        resolve({ code: 1, stdout, stderr });
      });
    });
  }

  /**
   * Check if a process is running
   * @param processName The name of the process to check
   * @returns A promise that resolves to true if the process is running
   */
  private async isProcessRunning(processName: string): Promise<boolean> {
    try {
      const { code, stdout } = await this.executeCommand("pgrep", ["-f", processName]);
      return code === 0 && stdout.trim() !== "";
    } catch (error) {
      console.error(`Error checking if ${processName} is running:`, error);
      return false;
    }
  }

  /**
   * Find the FFplay executable path
   */
  private async findFFplayPath(): Promise<string | null> {
    // First try the standard which command
    try {
      const { code, stdout } = await this.executeCommand("which", ["ffplay"]);
      if (code === 0 && stdout.trim()) {
        return stdout.trim();
      }
    } catch (error) {
      console.error("Error finding FFplay path using 'which':", error);
      // Continue with other checks
    }

    // Check common paths where FFplay might be installed
    const commonPaths = ["/opt/homebrew/bin/ffplay", "/usr/local/bin/ffplay", "/usr/bin/ffplay"];

    for (const path of commonPaths) {
      try {
        const { code } = await this.executeCommand("test", ["-x", path]);
        if (code === 0) {
          console.log(`FFplay found at: ${path}`);
          return path;
        }
      } catch (error) {
        console.error(`Error checking if FFplay exists at ${path}:`, error);
        // Continue checking other paths
      }
    }

    console.error("FFplay not found in any common locations");
    return null;
  }

  private async isFFplayInstalled(): Promise<boolean> {
    const ffplayPath = await this.findFFplayPath();
    return ffplayPath !== null;
  }

  /**
   * Start an RTSP stream for a device
   * @param deviceId The ID of the device
   * @param rtspUrl The RTSP URL to stream
   * @param cameraName The name of the camera
   * @returns A promise that resolves to the stream process
   */
  public async startRtspStream(
    deviceId: string,
    rtspUrl: string,
    cameraName: string = "Nest Camera"
  ): Promise<StreamProcess> {
    // Kill any existing process for this device
    await this.stopStream(deviceId);

    console.log(`ProcessManager: Starting RTSP stream for device ${deviceId}`);

    // Check if FFplay is installed
    const ffplayInstalled = await this.isFFplayInstalled();
    if (!ffplayInstalled) {
      const error = new Error("FFplay not found. Please install FFmpeg.");
      console.error(`Error starting RTSP stream: ${error}`);

      await showToast({
        style: Toast.Style.Failure,
        title: "FFplay Not Found",
        message: "Please install FFmpeg using Homebrew",
        primaryAction: {
          title: "Install FFmpeg",
          onAction: () => {
            open("https://formulae.brew.sh/formula/ffmpeg");
          },
        },
      });

      throw error;
    }

    // Check if the script exists
    if (!existsSync(this.scriptPath)) {
      const error = new Error(`Script not found at ${this.scriptPath}`);
      console.error(`Error starting RTSP stream: ${error}`);

      await showToast({
        style: Toast.Style.Failure,
        title: "Stream Error",
        message: "Script not found. Please reinstall the extension.",
      });

      throw error;
    }

    // Make sure the script is executable
    try {
      const { code, stderr } = await this.executeCommand("chmod", ["+x", this.scriptPath]);
      if (code !== 0) {
        console.error(`Error making script executable: ${stderr}`);
      }
    } catch (error) {
      console.error(`Error making script executable: ${error}`);
      // Continue anyway, it might already be executable
    }

    // Kill any existing FFplay processes to avoid conflicts
    const isFFplayRunning = await this.isProcessRunning("ffplay");
    if (isFFplayRunning) {
      console.log("ProcessManager: FFplay is already running, killing it first");
      await this.executeCommand("pkill", ["-f", "ffplay"]);
      // Give it a moment to terminate
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Start the FFplay process using our script
    const ffplayPath = await this.findFFplayPath();
    if (!ffplayPath) {
      const error = new Error("FFplay not found. Please install FFmpeg.");
      console.error(`Error starting RTSP stream: ${error}`);
      throw error;
    }

    console.log(`Using FFplay at: ${ffplayPath}`);
    const process = spawn(this.scriptPath, [rtspUrl, cameraName, `--ffplay-path=${ffplayPath}`], {
      detached: true, // Allow the process to run independently
      stdio: ["ignore", "pipe", "pipe"], // Capture stdout and stderr
    });

    // Create process record
    const streamProcess: StreamProcess = {
      pid: process.pid!,
      deviceId,
      startTime: new Date(),
      process,
    };

    // Store in active processes map
    this.activeProcesses.set(deviceId, streamProcess);

    let errorOutput = "";
    let hasStarted = false;

    // Log process output
    process.stdout?.on("data", (data) => {
      const output = data.toString();
      console.log(`FFplay output: ${output}`);

      if (output.includes("Starting FFplay")) {
        hasStarted = true;
      }

      if (output.includes("Error:")) {
        errorOutput += output;
      }
    });

    process.stderr?.on("data", (data) => {
      const error = data.toString();
      console.error(`FFplay error: ${error}`);
      errorOutput += error;
    });

    // Handle process exit
    process.on("exit", async (code) => {
      console.log(`FFplay process exited with code ${code}`);
      this.activeProcesses.delete(deviceId);

      // If process exited with error and didn't start properly
      if (code !== 0 && !hasStarted) {
        console.error(`Stream failed to start: ${errorOutput}`);

        if (errorOutput.includes("ffplay not found") || errorOutput.includes("FFplay not found")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "FFplay Not Found",
            message: "Please install FFmpeg using Homebrew",
            primaryAction: {
              title: "Install FFmpeg",
              onAction: () => {
                open("https://formulae.brew.sh/formula/ffmpeg");
              },
            },
          });
        } else if (errorOutput.includes("Connection refused") || errorOutput.includes("Failed to connect")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Connection Error",
            message: "Failed to connect to camera. Check if it's online.",
          });
        } else if (errorOutput.includes("Invalid data")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Stream Error",
            message: "Invalid data received from camera.",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Stream Error",
            message: `Failed to start stream (code: ${code})`,
          });
        }
      }
    });

    return streamProcess;
  }

  /**
   * Stop an RTSP stream for a device
   * @param deviceId The ID of the device
   */
  public async stopStream(deviceId: string): Promise<void> {
    const process = this.activeProcesses.get(deviceId);
    if (!process) {
      console.log(`ProcessManager: No active process found for device ${deviceId}`);
      return;
    }

    console.log(`ProcessManager: Stopping stream for device ${deviceId}`);

    try {
      // First try to terminate gracefully with SIGTERM
      process.process.kill("SIGTERM");

      // Give the process a moment to terminate gracefully
      await new Promise((resolve) => setTimeout(resolve, 300));

      // If the process is still running, force kill it
      try {
        process.process.kill("SIGKILL");
      } catch (error) {
        // Process may already be terminated, which is fine
      }

      // Check if FFplay is still running
      const isFFplayRunning = await this.isProcessRunning("ffplay");
      if (isFFplayRunning) {
        console.log("ProcessManager: FFplay is still running, attempting to terminate it");

        // First try SIGTERM
        const { code: killCode } = await this.executeCommand("pkill", ["-f", "ffplay"]);

        if (killCode !== 0) {
          console.log("ProcessManager: Failed to terminate FFplay with SIGTERM, trying SIGKILL");
          await this.executeCommand("pkill", ["-9", "-f", "ffplay"]);
        }
      }

      this.activeProcesses.delete(deviceId);
    } catch (error) {
      console.error(`Error stopping stream: ${error}`);

      // Remove from active processes even if there was an error
      this.activeProcesses.delete(deviceId);
    }
  }

  /**
   * Clean up all active processes
   */
  public async cleanup(): Promise<void> {
    if (this.isCleaningUp) {
      return;
    }

    this.isCleaningUp = true;
    console.log("ProcessManager: Cleaning up all processes");

    // Kill all active processes
    const processes = Array.from(this.activeProcesses.entries());
    for (const [deviceId] of processes) {
      try {
        await this.stopStream(deviceId);
      } catch (error) {
        console.error(`Error cleaning up process for device ${deviceId}: ${error}`);
      }
    }

    // Make sure all FFplay processes are terminated
    try {
      const isFFplayRunning = await this.isProcessRunning("ffplay");
      if (isFFplayRunning) {
        console.log("ProcessManager: FFplay processes still running, force killing them");
        await this.executeCommand("pkill", ["-9", "-f", "ffplay"]);
      }
    } catch (error) {
      console.error(`Error killing FFplay processes: ${error}`);
    }

    // Clear the map
    this.activeProcesses.clear();
    this.isCleaningUp = false;
  }

  /**
   * Get the active process for a device
   * @param deviceId The ID of the device
   * @returns The active process for the device, or undefined if none exists
   */
  public getActiveProcess(deviceId: string): StreamProcess | undefined {
    return this.activeProcesses.get(deviceId);
  }

  /**
   * Get all active processes
   * @returns An array of all active processes
   */
  public getAllActiveProcesses(): StreamProcess[] {
    return Array.from(this.activeProcesses.values());
  }
}
