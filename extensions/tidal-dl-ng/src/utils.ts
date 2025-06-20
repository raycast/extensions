import { exec, spawn } from "child_process";
import { promisify } from "util";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export interface Preferences {
  executionMode: "local" | "remote";
  remoteHost?: string;
  remotePort?: string;
  remoteUser?: string;
  sshKeyPath?: string;
  sshPassword?: string;
}

export interface TidalConfig {
  [key: string]: string;
}

export interface TidalUrl {
  type: "track" | "album" | "playlist" | "video" | "artist";
  id: string;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

export function parseTidalUrl(url: string): TidalUrl | null {
  const patterns = [
    { regex: /(?:tidal\.com\/browse\/)?track\/(\d+)/i, type: "track" as const },
    { regex: /(?:tidal\.com\/browse\/)?album\/(\d+)/i, type: "album" as const },
    { regex: /(?:tidal\.com\/browse\/)?playlist\/([\w-]+)/i, type: "playlist" as const },
    { regex: /(?:tidal\.com\/browse\/)?video\/(\d+)/i, type: "video" as const },
    { regex: /(?:tidal\.com\/browse\/)?artist\/(\d+)/i, type: "artist" as const },
  ];

  for (const { regex, type } of patterns) {
    const match = url.match(regex);
    if (match) {
      return { type, id: match[1] };
    }
  }

  // If just a numeric ID, assume it's a track
  if (/^\d+$/.test(url)) {
    return { type: "track", id: url };
  }

  return null;
}

export async function executeCommand(command: string, showOutput = false): Promise<string> {
  const prefs = getPreferences();
  let fullCommand: string;

  if (prefs.executionMode === "remote") {
    if (!prefs.remoteHost) {
      throw new Error("Remote host not configured");
    }

    const sshArgs: string[] = ["ssh"];

    if (prefs.remotePort && prefs.remotePort !== "22") {
      sshArgs.push("-p", prefs.remotePort);
    }

    if (prefs.sshKeyPath) {
      sshArgs.push("-i", expandPath(prefs.sshKeyPath));
    }

    if (prefs.sshPassword) {
      // For password auth, we'll need sshpass
      sshArgs.unshift("sshpass", "-p", prefs.sshPassword);
    }

    const userHost = prefs.remoteUser ? `${prefs.remoteUser}@${prefs.remoteHost}` : prefs.remoteHost;
    // Escape the command for the remote shell by wrapping in single quotes and escaping any single quotes
    const escapedCommand = `'${command.replace(/'/g, "'\"'\"'")}'`;
    sshArgs.push(userHost, escapedCommand);

    fullCommand = sshArgs.join(" ");
  } else {
    fullCommand = command;
  }

  try {
    if (showOutput) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Executing command...",
      });
    }

    const { stdout, stderr } = await execAsync(fullCommand);

    if (stderr && !stderr.includes("Warning")) {
      console.error("Command stderr:", stderr);
    }

    return stdout.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (showOutput) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command failed",
        message: errorMessage,
      });
    }
    throw new Error(errorMessage);
  }
}

export async function getTidalConfig(): Promise<TidalConfig> {
  const prefs = getPreferences();

  try {
    if (prefs.executionMode === "remote") {
      // For remote mode, read the config file via SSH
      // Use single quotes to prevent local shell expansion of ~
      const sshCommand = buildSSHCommand(prefs, `cat '~/.config/tidal_dl_ng/settings.json'`);

      const configData = await execAsync(sshCommand);
      const rawConfig = JSON.parse(configData.stdout);

      // Convert all values to strings for consistent handling
      const stringConfig: TidalConfig = {};
      for (const [key, value] of Object.entries(rawConfig)) {
        if (value !== null && value !== undefined) {
          stringConfig[key] = String(value);
        }
      }

      return stringConfig;
    } else {
      // For local mode, read the config file directly
      const userHome = homedir();
      const configPath = join(userHome, ".config", "tidal_dl_ng", "settings.json");

      if (!existsSync(configPath)) {
        return {};
      }

      const configData = await readFile(configPath, "utf8");
      const rawConfig = JSON.parse(configData);

      // Convert all values to strings for consistent handling
      const stringConfig: TidalConfig = {};
      for (const [key, value] of Object.entries(rawConfig)) {
        if (value !== null && value !== undefined) {
          stringConfig[key] = String(value);
        }
      }

      return stringConfig;
    }
  } catch (error) {
    console.error("Failed to read config:", error);
    return {};
  }
}

function buildSSHCommand(prefs: Preferences, command: string): string {
  if (!prefs.remoteHost) {
    throw new Error("Remote host not configured");
  }

  const sshArgs: string[] = ["ssh"];

  if (prefs.remotePort && prefs.remotePort !== "22") {
    sshArgs.push("-p", prefs.remotePort);
  }

  if (prefs.sshKeyPath) {
    sshArgs.push("-i", expandPath(prefs.sshKeyPath));
  }

  if (prefs.sshPassword) {
    sshArgs.unshift("sshpass", "-p", prefs.sshPassword);
  }

  const userHost = prefs.remoteUser ? `${prefs.remoteUser}@${prefs.remoteHost}` : prefs.remoteHost;
  sshArgs.push(userHost, command);

  return sshArgs.join(" ");
}

export function validateConfigValue(key: string, value: string): { isValid: boolean; error?: string } {
  const validations: Record<string, (val: string) => { isValid: boolean; error?: string }> = {
    // Audio/Video Quality
    quality_audio: (val) => {
      const validQualities = ["LOW", "HIGH", "LOSSLESS", "HI_RES_LOSSLESS"];
      return validQualities.includes(val)
        ? { isValid: true }
        : { isValid: false, error: `Must be one of: ${validQualities.join(", ")}` };
    },
    quality_video: (val) => {
      const validVideoQualities = ["360", "480", "720", "1080"];
      return validVideoQualities.includes(val)
        ? { isValid: true }
        : { isValid: false, error: `Must be one of: ${validVideoQualities.join(", ")}` };
    },

    // Cover Dimensions
    metadata_cover_dimension: (val) => {
      const validDimensions = ["320", "640", "1280"];
      return validDimensions.includes(val)
        ? { isValid: true }
        : { isValid: false, error: `Must be one of: ${validDimensions.join(", ")}` };
    },

    // Numeric validations
    downloads_concurrent_max: (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0 ? { isValid: true } : { isValid: false, error: "Must be a positive integer" };
    },
    downloads_simultaneous_per_track_max: (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num > 0 ? { isValid: true } : { isValid: false, error: "Must be a positive integer" };
    },
    album_track_num_pad_min: (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 0 ? { isValid: true } : { isValid: false, error: "Must be an integer >= 0" };
    },
    download_delay_sec_min: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 ? { isValid: true } : { isValid: false, error: "Must be a positive number" };
    },
    download_delay_sec_max: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 ? { isValid: true } : { isValid: false, error: "Must be a positive number" };
    },
  };

  // Add boolean validation for all boolean keys
  const booleanKeys = [
    "skip_existing",
    "lyrics_embed",
    "lyrics_file",
    "video_download",
    "download_delay",
    "video_convert_mp4",
    "metadata_cover_embed",
    "cover_album_file",
    "extract_flac",
    "symlink_to_track",
    "playlist_create",
    "metadata_replay_gain",
  ];

  booleanKeys.forEach((key) => {
    validations[key] = (val) => {
      const validBools = ["True", "False", "true", "false"];
      return validBools.includes(val) ? { isValid: true } : { isValid: false, error: "Must be True or False" };
    };
  });

  const validator = validations[key];
  return validator ? validator(value) : { isValid: true };
}

export async function setTidalConfig(key: string, value: string): Promise<void> {
  // Validate the value before setting
  const validation = validateConfigValue(key, value);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid value");
  }

  // Ensure we have the correct tidal command path
  if (tidalCommand === "tidal-dl-ng") {
    console.log("tidalCommand not set, running checkTidalInstallation");
    const isInstalled = await checkTidalInstallation();
    if (!isInstalled) {
      throw new Error("tidal-dl-ng not found");
    }
  }

  console.log(`Setting config: ${key} = ${value}`);
  console.log(`Using command: ${tidalCommand}`);

  // Always quote values to handle special characters properly
  const quotedValue = `"${value.replace(/"/g, '\\"')}"`;
  const command = `${tidalCommand} cfg ${key} ${quotedValue}`;
  console.log(`Full command: ${command}`);

  try {
    const output = await executeCommand(command, false);
    console.log(`Command output: ${output}`);

    await showToast({
      style: Toast.Style.Success,
      title: "Configuration updated",
      message: `${key} = ${value}`,
    });
  } catch (error) {
    console.error(`Config set error:`, error);
    throw error;
  }
}

export function getTidalCommand(): string {
  return tidalCommand;
}

export async function checkTidalInstallation(): Promise<boolean> {
  // Common locations where tidal-dl-ng might be installed
  const userHome = homedir();
  const possiblePaths = [
    `${userHome}/.local/bin/tidal-dl-ng`,
    "/usr/local/bin/tidal-dl-ng",
    "/opt/homebrew/bin/tidal-dl-ng",
    "tidal-dl-ng", // Will use PATH
  ];

  for (const path of possiblePaths) {
    try {
      // Try to run version command to verify it works
      await executeCommand(`${path} --version`);
      // If successful, update our command execution to use this path
      tidalCommand = path;
      return true;
    } catch {
      // Continue to next path
    }
  }

  return false;
}

// Store the working tidal-dl-ng command path
let tidalCommand = "tidal-dl-ng";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
}

export interface StreamingCommandOptions {
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
  onExit?: (code: number | null) => void;
  title?: string;
  showProgress?: boolean;
}

export async function executeStreamingCommand(
  command: string,
  options: StreamingCommandOptions = {}
): Promise<{ success: boolean; output: string; toast?: Toast }> {
  const prefs = getPreferences();
  let fullCommand: string;
  let args: string[];

  if (prefs.executionMode === "remote") {
    if (!prefs.remoteHost) {
      throw new Error("Remote host not configured");
    }

    const sshArgs: string[] = [];

    if (prefs.sshPassword) {
      sshArgs.push("sshpass", "-p", prefs.sshPassword);
    }

    sshArgs.push("ssh");

    if (prefs.remotePort && prefs.remotePort !== "22") {
      sshArgs.push("-p", prefs.remotePort);
    }

    if (prefs.sshKeyPath) {
      sshArgs.push("-i", expandPath(prefs.sshKeyPath));
    }

    const userHost = prefs.remoteUser ? `${prefs.remoteUser}@${prefs.remoteHost}` : prefs.remoteHost;
    const escapedCommand = `'${command.replace(/'/g, "'\"'\"'")}'`;
    sshArgs.push(userHost, escapedCommand);

    fullCommand = sshArgs[0];
    args = sshArgs.slice(1);
  } else {
    fullCommand = "sh";
    args = ["-c", command];
  }

  // Create toast if showProgress is enabled
  let toast: Toast | undefined;
  if (options.showProgress) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: options.title || "Processing...",
      message: "Download started",
    });
  }

  return new Promise((resolve) => {
    let output = "";
    let hasError = false;
    let downloadedCount = 0;

    const childProcess = spawn(fullCommand, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    childProcess.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      output += text;

      // Simple counter logic - only count "Downloaded item" occurrences
      if (toast) {
        console.log("tidal-dl-ng output:", text.trim());

        // Count occurrences of "Downloaded item" in the output
        const downloadedMatches = text.match(/Downloaded item/gi);
        if (downloadedMatches) {
          downloadedCount += downloadedMatches.length;
          toast.message = `Downloaded ${downloadedCount} item${downloadedCount !== 1 ? "s" : ""}`;
        }

        // Show initial status if no downloads yet
        if (downloadedCount === 0 && toast.message === "Download started") {
          if (text.includes("Fetching") || text.includes("Loading") || text.includes("Processing")) {
            toast.message = "Processing...";
          }
        }
      }

      options.onOutput?.(text);
    });

    childProcess.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      output += text;

      // Don't treat warnings as errors
      if (!text.includes("Warning")) {
        hasError = true;
        if (toast && text.includes("ERROR")) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download Failed";
          toast.message = text;
        }
      }
      options.onError?.(text);
    });

    childProcess.on("close", (code) => {
      const success = code === 0 && !hasError;

      if (toast) {
        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = "Download Complete";
          if (downloadedCount > 0) {
            toast.message = `Successfully downloaded ${downloadedCount} item${downloadedCount > 1 ? "s" : ""}`;
          } else if (output.toLowerCase().includes("skip")) {
            toast.message = "All items already downloaded (skipped)";
          } else {
            toast.message = "Operation completed successfully";
          }
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Download Failed";
          if (!toast.message || toast.message === "Download started") {
            toast.message = "Check the detailed output for error information";
          }
        }
      }

      options.onExit?.(code);
      resolve({
        success: success,
        output: output.trim(),
        toast: toast,
      });
    });

    childProcess.on("error", (error) => {
      console.log("Process error:", error);
      hasError = true;
      const errorText = error.message;
      output += errorText;

      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Command Failed";
        toast.message = errorText;
      }

      options.onError?.(errorText);
      resolve({
        success: false,
        output: output.trim(),
        toast: toast,
      });
    });
  });
}
