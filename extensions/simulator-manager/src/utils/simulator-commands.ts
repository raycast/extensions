import { getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { Device, DeviceType, SimulatorDevice } from "../types";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getAndroidVersionFromApiLevel, getDeviceType } from "../utils";
import { TOAST_MESSAGES } from "../constants";

// Get user preferences
interface Preferences {
  androidSdkPath?: string;
}

export const execAsync = promisify(exec);

// Fetch iOS simulators
export async function fetchIOSDevices() {
  try {
    const { stdout: simulatorsOutput } = await execAsync("xcrun simctl list devices --json");
    const simulatorsData = JSON.parse(simulatorsOutput);

    const iosDevices: Device[] = [];

    // Process iOS simulators
    Object.entries(simulatorsData.devices).forEach(([runtime, deviceList]) => {
      // Type assertion to help TypeScript understand the structure
      const devices = deviceList as SimulatorDevice[];

      const runtimeWithoutPrefix = runtime.replace("com.apple.CoreSimulator.SimRuntime.", "");

      const formattedRuntime = runtimeWithoutPrefix
        .replace("iOS-", "iOS ")
        .replace(/-/g, ".")
        .replace("tvOS-", "tvOS ")
        .replace("watchOS-", "watchOS ");

      devices.forEach((device) => {
        const deviceType = getDeviceType(device.name);
        iosDevices.push({
          id: device.udid,
          name: device.name,
          status: device.state,
          type: device.deviceTypeIdentifier || "",
          runtime: formattedRuntime,
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
export function findAndroidSdkTool(toolName: string) {
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
export async function fetchAndroidDevices() {
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
        showFailureToast(
          new Error("The emulator executable was not found in the specified SDK path. Please check your settings."),
          {
            title: "Android SDK not found",
          },
        );
      } else {
        console.warn("Android emulator executable not found");
        showFailureToast(new Error("Please set the Android SDK path in the extension preferences."), {
          title: "Android SDK not found",
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
      let deviceType: DeviceType = "Android Phone";
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
          androidVersion = getAndroidVersionFromApiLevel(apiLevel);
        } else {
          // Fallback to target property if image.sysdir.1 is not found
          const apiLevelMatch = configContent.match(/target\s*=\s*([0-9]+)/);
          if (apiLevelMatch && apiLevelMatch[1]) {
            const apiLevel = parseInt(apiLevelMatch[1]);
            androidVersion = getAndroidVersionFromApiLevel(apiLevel);
          }
        }

        // If we still don't have a version, try to extract it from the AVD name
        if (androidVersion === "Unknown") {
          const apiLevelInName = avdName.match(/API_(\d+)/i) || avdName.match(/Android_(\d+)/i);
          if (apiLevelInName && apiLevelInName[1]) {
            const apiLevel = parseInt(apiLevelInName[1]);
            androidVersion = getAndroidVersionFromApiLevel(apiLevel);
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

export async function bootAndOpenSimulator(deviceId: string) {
  try {
    await execAsync(`xcrun simctl boot ${deviceId}`);
    await execAsync(`open -a Simulator --args -CurrentDeviceUDID ${deviceId}`);

    showToast(TOAST_MESSAGES.SUCCESS.SIMULATOR_STARTED);
  } catch (error) {
    showFailureToast(error, TOAST_MESSAGES.FAILURE.SIMULATOR_START_FAILED);
    throw error;
  }
}

export async function shutdownSimulator(deviceId: string) {
  try {
    await execAsync(`xcrun simctl shutdown ${deviceId}`);

    showToast(TOAST_MESSAGES.SUCCESS.SIMULATOR_SHUTDOWN);
  } catch (error) {
    showFailureToast(error, TOAST_MESSAGES.FAILURE.SIMULATOR_SHUTDOWN_FAILED);
    throw error;
  }
}

export async function startAndroidEmulator(avdName: string) {
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

    showToast(TOAST_MESSAGES.SUCCESS.ANDROID_EMULATOR_STARTING);
  } catch (error) {
    showFailureToast(error, TOAST_MESSAGES.FAILURE.ANDROID_EMULATOR_START_FAILED);
    throw error;
  }
}

export async function stopAndroidEmulator(avdName: string) {
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

    // Log for debugging
    console.log(`Trying to stop AVD: ${avdName}`);
    console.log(`Running emulators: ${JSON.stringify(runningEmulators)}`);

    // Create a mapping of emulator IDs to AVD names
    const emulatorToAvdMap = new Map<string, string>();

    // Try to get AVD names for all running emulators
    for (const emulatorId of runningEmulators) {
      try {
        // Use adb emu avd name to get the AVD name of the running emulator
        const { stdout } = await execAsync(`${adbPath} -s ${emulatorId} emu avd name`);
        // Clean up the AVD name - remove any trailing "OK" and whitespace
        const trimmedAvdName = stdout.replace(/\s*OK\s*$/, "").trim();

        console.log(`Emulator ${emulatorId} is running AVD: '${trimmedAvdName}'`);

        if (trimmedAvdName) {
          emulatorToAvdMap.set(emulatorId, trimmedAvdName);
        }
      } catch (error) {
        console.warn(`Could not get AVD name for ${emulatorId}:`, error);
      }
    }

    // Find the emulator running our target AVD
    let targetEmulatorId: string | null = null;

    // First, try exact string matching
    for (const [emulatorId, runningAvdName] of emulatorToAvdMap.entries()) {
      if (runningAvdName === avdName) {
        targetEmulatorId = emulatorId;
        console.log(`Found exact match: ${emulatorId} is running ${avdName}`);
        break;
      }
    }

    // If no exact match, check if any of the running AVDs contains our target AVD name
    if (!targetEmulatorId) {
      for (const [emulatorId, runningAvdName] of emulatorToAvdMap.entries()) {
        if (runningAvdName.includes(avdName)) {
          targetEmulatorId = emulatorId;
          console.log(`Found partial match: ${emulatorId} is running ${runningAvdName} which includes ${avdName}`);
          break;
        }
      }
    }

    // If still no match, try case-insensitive comparison
    if (!targetEmulatorId) {
      const lowerAvdName = avdName.toLowerCase();
      for (const [emulatorId, runningAvdName] of emulatorToAvdMap.entries()) {
        if (runningAvdName.toLowerCase() === lowerAvdName) {
          targetEmulatorId = emulatorId;
          console.log(`Found case-insensitive match: ${emulatorId} is running ${runningAvdName}`);
          break;
        }
      }
    }

    // If still no match, try case-insensitive partial match
    if (!targetEmulatorId) {
      const lowerAvdName = avdName.toLowerCase();
      for (const [emulatorId, runningAvdName] of emulatorToAvdMap.entries()) {
        if (runningAvdName.toLowerCase().includes(lowerAvdName)) {
          targetEmulatorId = emulatorId;
          console.log(
            `Found case-insensitive partial match: ${emulatorId} is running ${runningAvdName} which includes ${avdName}`,
          );
          break;
        }
      }
    }

    // If we still don't have a target, try using ps command to correlate process info with running emulators
    if (!targetEmulatorId) {
      try {
        console.log("Trying ps command to find the emulator process");
        const psOutput = await execAsync("ps aux | grep -v grep | grep qemu-system")
          .then((result) => result.stdout)
          .catch((error) => {
            if (error.code === 1) return ""; // No matches
            throw error;
          });

        console.log(`PS output: ${psOutput}`);

        // Look for the AVD name in the process list
        const psLines = psOutput.split("\n");

        // Create a map of AVD names to process IDs from the ps output
        const avdToPidMap = new Map<string, number>();

        for (const line of psLines) {
          const avdMatch = line.match(/-avd\s+([^\s]+)/);
          if (avdMatch && avdMatch[1]) {
            const avdNameFromPs = avdMatch[1];
            const pidMatch = line.match(/^\S+\s+(\d+)/);
            if (pidMatch && pidMatch[1]) {
              const pid = parseInt(pidMatch[1]);
              avdToPidMap.set(avdNameFromPs, pid);
              console.log(`Found process for AVD ${avdNameFromPs} with PID ${pid}`);
            }
          }
        }

        // If we found our target AVD in the ps output
        if (avdToPidMap.has(avdName)) {
          const targetPid = avdToPidMap.get(avdName);
          console.log(`Found target AVD ${avdName} with PID ${targetPid}`);

          // Now we need to find which emulator ID corresponds to this process
          // We can use the 'adb emu avd pid' command to get the PID for each emulator
          for (const emulatorId of runningEmulators) {
            try {
              const { stdout: pidOutput } = await execAsync(`${adbPath} -s ${emulatorId} emu avd pid`);
              const emulatorPid = parseInt(pidOutput.trim());
              console.log(`Emulator ${emulatorId} has PID ${emulatorPid}`);

              if (emulatorPid === targetPid) {
                targetEmulatorId = emulatorId;
                console.log(`Matched emulator ${emulatorId} to PID ${targetPid} for AVD ${avdName}`);
                break;
              }
            } catch (error) {
              console.warn(`Could not get PID for emulator ${emulatorId}:`, error);
            }
          }

          // If we still couldn't match by PID, but we have the AVD in our map
          if (!targetEmulatorId) {
            // Try to match by AVD name again with the cleaned up names
            for (const [emulatorId, runningAvdName] of emulatorToAvdMap.entries()) {
              // Clean up the AVD name from ps for comparison
              const cleanAvdName = avdName.replace(/\s+/g, "");
              const cleanRunningAvdName = runningAvdName.replace(/\s+/g, "");

              if (cleanRunningAvdName === cleanAvdName) {
                targetEmulatorId = emulatorId;
                console.log(`Matched emulator ${emulatorId} to AVD ${avdName} after cleanup`);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.warn("Error using ps command:", error);
      }
    }

    // If we still don't have a target but have only one running emulator, use it as a last resort
    if (!targetEmulatorId && runningEmulators.length === 1) {
      targetEmulatorId = runningEmulators[0];
      console.log(`Using only running emulator as fallback: ${targetEmulatorId}`);
    }

    // If we still don't have a target, we can't proceed
    if (!targetEmulatorId) {
      throw new Error(`Could not identify which emulator is running AVD: ${avdName}`);
    }

    console.log(`Stopping emulator: ${targetEmulatorId}`);

    // Stop the target emulator
    await execAsync(`${adbPath} -s ${targetEmulatorId} emu kill`);

    showToast(TOAST_MESSAGES.SUCCESS.ANDROID_EMULATOR_STOPPED);
  } catch (error) {
    console.error("Error stopping Android emulator:", error);
    showFailureToast(error, TOAST_MESSAGES.FAILURE.ANDROID_EMULATOR_STOP_FAILED);
    throw error;
  }
}
