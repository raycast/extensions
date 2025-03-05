// utils/simulator-commands.ts
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { Device, SimulatorDevice } from "../types";
import { getDeviceType } from "./device-utils";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Get user preferences
interface Preferences {
  androidSdkPath?: string;
}

export const execAsync = promisify(exec);

// Fetch iOS simulators
export async function fetchIOSDevices(): Promise<Device[]> {
  try {
    const { stdout: simulatorsOutput } = await execAsync("xcrun simctl list devices --json");
    const simulatorsData = JSON.parse(simulatorsOutput);

    const iosDevices: Device[] = [];

    // Process iOS simulators
    Object.entries(simulatorsData.devices).forEach(([runtime, deviceList]) => {
      // Type assertion to help TypeScript understand the structure
      const devices = deviceList as SimulatorDevice[];

      devices.forEach((device) => {
        const deviceType = getDeviceType(device.name);
        iosDevices.push({
          id: device.udid,
          name: device.name,
          status: device.state,
          type: device.deviceTypeIdentifier || "",
          runtime: runtime.replace("com.apple.CoreSimulator.SimRuntime.", ""),
          category: "ios",
          deviceType,
        });
      });
    });

    return iosDevices;
  } catch (error) {
    console.error("Error fetching iOS devices:", error);
    throw error;
  }
}

// Find Android SDK tools
function findAndroidSdkTool(toolName: string): string | null {
  // Get the custom SDK path from preferences
  const preferences = getPreferenceValues<Preferences>();
  const customSdkPath = preferences.androidSdkPath?.trim();

  // Environment variables
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

  const possiblePaths = [
    // Custom path from preferences (if provided)
    customSdkPath ? join(customSdkPath, "platform-tools", toolName) : null,
    customSdkPath ? join(customSdkPath, "emulator", toolName) : null,
    customSdkPath ? join(customSdkPath, "tools", toolName) : null,
    customSdkPath ? join(customSdkPath, "tools/bin", toolName) : null,

    // Direct paths
    `/usr/local/bin/${toolName}`,

    // From ANDROID_HOME
    androidHome ? join(androidHome, "platform-tools", toolName) : null,
    androidHome ? join(androidHome, "emulator", toolName) : null,
    androidHome ? join(androidHome, "tools", toolName) : null,
    androidHome ? join(androidHome, "tools/bin", toolName) : null,

    // Common locations
    join(homedir(), "Library/Android/sdk/platform-tools", toolName),
    join(homedir(), "Library/Android/sdk/emulator", toolName),
    join(homedir(), "Library/Android/sdk/tools", toolName),
    join(homedir(), "Library/Android/sdk/tools/bin", toolName),

    // Linux/Windows common locations
    join(homedir(), "Android/Sdk/platform-tools", toolName),
    join(homedir(), "Android/Sdk/emulator", toolName),
    join(homedir(), "Android/Sdk/tools", toolName),
    join(homedir(), "Android/Sdk/tools/bin", toolName),
  ].filter(Boolean) as string[];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

// Fetch Android emulators
export async function fetchAndroidDevices(): Promise<Device[]> {
  try {
    // Find emulator and adb executables
    const emulatorPath = findAndroidSdkTool("emulator");
    const adbPath = findAndroidSdkTool("adb");

    if (!emulatorPath) {
      // Get preferences to check if custom path was provided
      const preferences = getPreferenceValues<Preferences>();
      const customPathProvided = preferences.androidSdkPath?.trim();

      // Show a more helpful error message if a custom path was provided
      if (customPathProvided) {
        console.warn(`Android emulator executable not found in the specified path: ${customPathProvided}`);
        showToast({
          style: Toast.Style.Failure,
          title: "Android SDK not found",
          message: "The emulator executable was not found in the specified SDK path. Please check your settings.",
        });
      } else {
        console.warn("Android emulator executable not found");
        showToast({
          style: Toast.Style.Failure,
          title: "Android SDK not found",
          message: "Please set the Android SDK path in the extension preferences.",
        });
      }
      return [];
    }

    // Get list of available AVDs
    const { stdout: avdListOutput } = await execAsync(`${emulatorPath} -list-avds`);
    const avdNames = avdListOutput.trim().split("\n").filter(Boolean);

    if (avdNames.length === 0) {
      console.warn("No Android Virtual Devices found");
      return [];
    }

    // Initialize running devices array and map
    let runningDevices: string[] = [];
    const runningAvds: Set<string> = new Set();

    // Get running emulators if adb is available
    if (adbPath) {
      try {
        // Get list of running emulator IDs
        const { stdout: adbDevicesOutput } = await execAsync(`${adbPath} devices`);
        runningDevices = adbDevicesOutput
          .split("\n")
          .slice(1) // Skip the first line which is the header
          .filter((line) => line.includes("emulator-") && line.includes("device"))
          .map((line) => line.split("\t")[0]); // Get the device ID

        // For each running emulator, try to determine which AVD it is
        for (const emulatorId of runningDevices) {
          try {
            // Use adb emu avd name to get the AVD name of the running emulator
            const { stdout: avdNameOutput } = await execAsync(`${adbPath} -s ${emulatorId} emu avd name`);
            const runningAvdName = avdNameOutput.trim();

            if (runningAvdName && avdNames.includes(runningAvdName)) {
              runningAvds.add(runningAvdName);
            }
          } catch (error) {
            // If this command fails, try alternative method
            console.warn(`Could not get AVD name for ${emulatorId}:`, error);
          }
        }

        // If we couldn't determine the AVD names using the emu command, try using ps
        if (runningDevices.length > 0 && runningAvds.size === 0) {
          try {
            // On macOS, we can use ps to check running emulators
            // Note: grep returns exit code 1 if no matches are found, which isn't an error in this context
            const psOutput = await execAsync("ps aux | grep -v grep | grep qemu-system")
              .then((result) => result.stdout)
              .catch((error) => {
                // Exit code 1 from grep means no matches found, which is fine
                if (error.code === 1) {
                  return "";
                }
                // For other errors, rethrow
                throw error;
              });

            // For each AVD, check if it's in the ps output
            for (const avdName of avdNames) {
              if (psOutput.includes(avdName)) {
                runningAvds.add(avdName);
              }
            }
          } catch (error) {
            console.warn("Error checking running emulators with ps:", error);
          }
        }
      } catch (error) {
        console.warn("Error getting running Android emulators:", error);
      }
    } else {
      console.warn("Android Debug Bridge (adb) not found, cannot determine running emulators");
    }

    // Read AVD config files to get more details
    const androidDevices: Device[] = [];

    for (const avdName of avdNames) {
      // Try to find the AVD config file
      const avdConfigPath = join(homedir(), ".android/avd", `${avdName}.avd/config.ini`);
      let deviceType = "Android Phone";
      let androidVersion = "Unknown";

      if (existsSync(avdConfigPath)) {
        const configContent = readFileSync(avdConfigPath, "utf-8");

        // Extract device type (phone/tablet)
        // Check for small_phone, medium_phone, etc.
        if (configContent.match(/hw\.device\.name\s*=\s*.*small_phone/)) {
          deviceType = "Android Phone";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*medium_phone/)) {
          deviceType = "Android Phone";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*large_phone/)) {
          deviceType = "Android Phone";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*pixel_[0-9]/)) {
          deviceType = "Android Phone";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*tablet/)) {
          deviceType = "Android Tablet";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*tv/)) {
          deviceType = "Android TV";
        } else if (configContent.match(/hw\.device\.name\s*=\s*.*wear/)) {
          deviceType = "Android Wear";
        }

        // Extract Android version from image.sysdir.1 property
        // This handles paths like system-images/android-35/google_apis/arm64-v8a/
        const androidVersionMatch = configContent.match(/image\.sysdir\.1\s*=\s*.*android-(\d+)/);
        if (androidVersionMatch && androidVersionMatch[1]) {
          const apiLevel = parseInt(androidVersionMatch[1]);
          androidVersion = `Android ${getAndroidVersionFromApiLevel(apiLevel)}`;
        } else {
          // Fallback to target property if image.sysdir.1 is not found
          const apiLevelMatch = configContent.match(/target\s*=\s*([0-9]+)/);
          if (apiLevelMatch && apiLevelMatch[1]) {
            const apiLevel = parseInt(apiLevelMatch[1]);
            androidVersion = `Android ${getAndroidVersionFromApiLevel(apiLevel)}`;
          }
        }

        // If we still don't have a version, try to extract it from the AVD name
        if (androidVersion === "Unknown") {
          const apiLevelInName = avdName.match(/API_(\d+)/i) || avdName.match(/Android_(\d+)/i);
          if (apiLevelInName && apiLevelInName[1]) {
            const apiLevel = parseInt(apiLevelInName[1]);
            androidVersion = `Android ${getAndroidVersionFromApiLevel(apiLevel)}`;
          }
        }
      }

      // Check if this specific emulator is running
      const isRunning = runningAvds.has(avdName);

      androidDevices.push({
        id: avdName,
        name: avdName,
        status: isRunning ? "Booted" : "Shutdown",
        type: deviceType,
        runtime: androidVersion,
        category: "android",
        deviceType,
      });
    }

    return androidDevices;
  } catch (error) {
    console.error("Error fetching Android devices:", error);
    // Return empty array instead of throwing to avoid breaking iOS functionality
    return [];
  }
}

// Helper function to convert API level to Android version
function getAndroidVersionFromApiLevel(apiLevel: number): string {
  const versionMap: Record<number, string> = {
    35: "15.0", // Android U
    34: "14.0", // Android Upside Down Cake
    33: "13.0", // Android Tiramisu
    32: "12.1", // Android 12L
    31: "12.0", // Android Snow Cone
    30: "11.0", // Android Red Velvet Cake
    29: "10.0", // Android Quince Tart
    28: "9.0", // Android Pie
    27: "8.1", // Android Oreo
    26: "8.0", // Android Oreo
    25: "7.1", // Android Nougat
    24: "7.0", // Android Nougat
    23: "6.0", // Android Marshmallow
    22: "5.1", // Android Lollipop
    21: "5.0", // Android Lollipop
    // Add more mappings as needed
  };

  return versionMap[apiLevel] || `API ${apiLevel}`;
}

// Execute a simulator command
export async function executeSimulatorCommand(
  command: string,
  deviceId: string,
  successMessage: string,
): Promise<void> {
  try {
    await execAsync(`xcrun simctl ${command} ${deviceId}`);
    showToast({
      style: Toast.Style.Success,
      title: successMessage,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: `Failed to ${command} simulator`,
      message: String(error),
    });
    throw error;
  }
}

// Open a simulator
export function openSimulator(deviceId: string): void {
  exec(`open -a Simulator --args -CurrentDeviceUDID ${deviceId}`);
  showToast({
    style: Toast.Style.Success,
    title: "Opening simulator",
  });
}

export async function startAndroidEmulator(avdName: string): Promise<void> {
  try {
    const emulatorPath = findAndroidSdkTool("emulator");
    if (!emulatorPath) {
      throw new Error("Android emulator executable not found");
    }

    // Start the emulator in a detached process using spawn instead of exec
    const process = spawn(emulatorPath, ["-avd", avdName, "-no-snapshot-load"], {
      detached: true,
      stdio: "ignore",
    });

    // Unref the process to allow the parent to exit independently
    process.unref();

    showToast({
      style: Toast.Style.Success,
      title: "Starting Android emulator",
      message: `${avdName} is starting in the background`,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to start Android emulator",
      message: String(error),
    });
    throw error;
  }
}

export async function stopAndroidEmulator(avdName: string): Promise<void> {
  try {
    const adbPath = findAndroidSdkTool("adb");
    if (!adbPath) {
      throw new Error("Android Debug Bridge (adb) executable not found");
    }

    // Get list of running emulators
    const { stdout: adbDevicesOutput } = await execAsync(`${adbPath} devices`);
    const runningEmulators = adbDevicesOutput
      .split("\n")
      .slice(1) // Skip the first line which is the header
      .filter((line) => line.includes("emulator-") && line.includes("device"))
      .map((line) => line.split("\t")[0]); // Get the device ID

    if (runningEmulators.length === 0) {
      throw new Error("No running Android emulators found");
    }

    // For each running emulator, try to stop it
    // This is a simplistic approach - ideally we would map AVD names to emulator IDs
    for (const emulatorId of runningEmulators) {
      await execAsync(`${adbPath} -s ${emulatorId} emu kill`);
    }

    showToast({
      style: Toast.Style.Success,
      title: "Android emulator stopped",
      message: `${avdName} has been shut down`,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop Android emulator",
      message: String(error),
    });
    throw error;
  }
}

export function openAndroidEmulator(avdName: string): void {
  try {
    const emulatorPath = findAndroidSdkTool("emulator");
    if (!emulatorPath) {
      throw new Error("Android emulator executable not found");
    }

    // Start the emulator using spawn instead of exec
    const process = spawn(emulatorPath, ["-avd", avdName], {
      detached: true,
      stdio: "ignore",
    });

    // Unref the process to allow the parent to exit independently
    process.unref();

    showToast({
      style: Toast.Style.Success,
      title: "Opening Android emulator",
      message: avdName,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Android emulator",
      message: String(error),
    });
  }
}
