import { exec } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { showToast, Toast } from "@raycast/api";

export interface WisprStats {
  totalWords: number;
  averageWPM: number;
}

export interface AudioDevice {
  name: string;
  id: string;
  manufacturer: string;
  transport: string;
  isDefault: boolean;
}

interface WisprConfig {
  prefs: {
    user: {
      overrideAudioDeviceId: string;
    };
  };
}

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export const getWisprStats = async (): Promise<WisprStats> => {
  return new Promise((resolve, reject) => {
    const dbPath = join(homedir(), "Library", "Application Support", "Wispr Flow", "flow.sqlite");

    // Check if database exists
    try {
      if (!existsSync(dbPath)) {
        reject(new Error("Wispr Flow database not found. Please ensure Wispr Flow is installed and has been used."));
        return;
      }
    } catch {
      reject(new Error("Unable to access Wispr Flow database."));
      return;
    }

    const query1 = `SELECT SUM(numWords) as total FROM History WHERE numWords IS NOT NULL`;
    const query2 = `SELECT AVG(numWords*60.0/duration) as avgWPM FROM History WHERE numWords > 0 AND duration > 0`;

    let totalWords = 0;
    let averageWPM = 0;
    let completedQueries = 0;
    let hasErrors = false;

    const checkComplete = () => {
      completedQueries++;
      if (completedQueries === 2) {
        if (hasErrors) {
          reject(new Error("Failed to read Wispr Flow statistics. Please check if Wispr Flow is properly installed."));
        } else {
          resolve({ totalWords, averageWPM });
        }
      }
    };

    exec(`sqlite3 "${dbPath}" "${query1}"`, (error, stdout) => {
      if (error) {
        hasErrors = true;
      } else {
        const result = stdout.trim();
        if (result && result !== "" && result !== "null") {
          totalWords = parseInt(result) || 0;
        }
      }
      checkComplete();
    });

    exec(`sqlite3 "${dbPath}" "${query2}"`, (error, stdout) => {
      if (error) {
        hasErrors = true;
      } else {
        const result = stdout.trim();
        if (result && result !== "" && result !== "null") {
          averageWPM = Math.round(parseFloat(result)) || 0;
        }
      }
      checkComplete();
    });
  });
};

export const getAudioInputDevices = async (): Promise<AudioDevice[]> => {
  return new Promise((resolve) => {
    exec("/usr/sbin/system_profiler SPAudioDataType -json", (error, stdout) => {
      if (error) {
        console.error("Error getting audio devices:", error);
        resolve([]); // Return empty array instead of rejecting
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const devices: AudioDevice[] = [];

        if (data.SPAudioDataType && data.SPAudioDataType[0] && data.SPAudioDataType[0]._items) {
          for (const device of data.SPAudioDataType[0]._items) {
            if (device._name && device.coreaudio_device_input && device.coreaudio_device_input > 0) {
              devices.push({
                name: device._name,
                id: device._name,
                manufacturer: device.coreaudio_device_manufacturer || "",
                transport: device.coreaudio_device_transport || "",
                isDefault: device.coreaudio_default_audio_input_device === "spaudio_yes",
              });
            }
          }
        }

        resolve(devices);
      } catch (parseError) {
        console.error("Error parsing audio data:", parseError);
        resolve([]); // Return empty array instead of rejecting
      }
    });
  });
};

export const getCurrentWisprMicrophone = (): string | null => {
  try {
    const configPath = join(homedir(), "Library", "Application Support", "Wispr Flow", "config.json");
    const configData = readFileSync(configPath, "utf8");
    const config: WisprConfig = JSON.parse(configData);
    return config.prefs?.user?.overrideAudioDeviceId || null;
  } catch {
    return null;
  }
};

export const getCurrentSystemInputDevice = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    // Try to get the current input device using osascript
    const script = 'tell application "System Preferences" to get the name of current input device of audio preferences';
    exec(`osascript -e '${script}' 2>/dev/null`, (error, stdout) => {
      if (error) {
        // Fallback: just return null and we'll show the device ID
        resolve(null);
        return;
      }

      const deviceName = stdout.trim();
      resolve(deviceName || null);
    });
  });
};

export const setWisprMicrophone = async (deviceId: string): Promise<void> => {
  try {
    const configPath = join(homedir(), "Library", "Application Support", "Wispr Flow", "config.json");
    const configData = readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);

    if (!config.prefs) config.prefs = {};
    if (!config.prefs.user) config.prefs.user = {};

    config.prefs.user.overrideAudioDeviceId = deviceId;

    writeFileSync(configPath, JSON.stringify(config, null, "\t"));

    // Try to restart Wispr Flow to pick up the new microphone setting
    exec('pkill -f "Wispr Flow" && sleep 1 && open "/Applications/Wispr Flow.app"', (error) => {
      if (error) {
        console.log("Could not restart Wispr Flow automatically");
      }
    });

    // Notify user of the change
    await showToast({
      style: Toast.Style.Success,
      title: "Microphone Changed",
      message: "Wispr Flow will restart to apply the change",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to update microphone setting",
    });
    throw error;
  }
};

export const launchWisprFlow = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec('open "/Applications/Wispr Flow.app"', (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};
