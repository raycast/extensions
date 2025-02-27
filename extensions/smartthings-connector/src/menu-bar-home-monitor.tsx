import { MenuBarExtra, Icon, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchCurrentLocationMode,
  fetchLocationModes,
  switchLocationMode,
  fetchDevices,
} from "./fetchDevices";
import { toggleLight, setLightLevel } from "./toggleLight";
import { LocationMode } from "./types";
import axios from "axios";

// Fixed 1 minute refresh interval
const REFRESH_INTERVAL_MS = 60000;

interface Preferences {
  enableBackgroundRefresh: boolean;
  apiToken: string;
  locationId: string;
}

interface Scene {
  sceneId: string;
  sceneName: string;
  lastExecutedDate?: string;
}

interface Device {
  deviceId: string;
  label: string;
  status?: {
    switch?: {
      switch?: {
        value?: string;
        timestamp?: string;
      };
    };
    switchLevel?: {
      level?: {
        value?: number;
      };
    };
  };
  components?: Array<{
    categories: Array<{ name: string }>;
  }>;
}

export default function Command() {
  const [currentMode, setCurrentMode] = useState<LocationMode>({
    id: "",
    name: "Loading...",
  });
  const [availableModes, setAvailableModes] = useState<LocationMode[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [lights, setLights] = useState<Device[]>([]);

  const preferences = getPreferenceValues<Preferences>();
  const preferencesRef = useRef(preferences);
  const intervalRef = useRef<NodeJS.Timeout>();
  const isActiveRef = useRef(true);

  // Fetch all available modes
  const loadModes = useCallback(async () => {
    try {
      const modes = await fetchLocationModes();
      if (Array.isArray(modes)) {
        setAvailableModes(modes);
      }
    } catch (error) {
      console.error("Failed to load modes:", error);
    }
  }, []);

  const updateCurrentMode = useCallback(async () => {
    if (!isActiveRef.current) return;

    try {
      const timestamp = new Date().toLocaleString();
      console.log("\n=== Background Refresh Details ===");
      console.log("Timestamp:", timestamp);
      console.log("Current Settings:");
      console.log(
        "- Background Refresh:",
        preferencesRef.current.enableBackgroundRefresh ? "Enabled" : "Disabled"
      );

      const modeData = await fetchCurrentLocationMode();
      console.log("API Response:", JSON.stringify(modeData, null, 2));

      if (modeData?.id) {
        const newMode = {
          id: modeData.id,
          name: modeData.label || modeData.name,
        };

        setCurrentMode((prev) => {
          if (prev.id !== newMode.id || prev.name !== newMode.name) {
            console.log("\nMode Change Detected:", { prev, new: newMode });
            return newMode;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("\nError During Refresh:", error);
    }
  }, []);

  const handleModeSwitch = useCallback(
    async (mode: LocationMode) => {
      try {
        await switchLocationMode(mode.id);
        await updateCurrentMode();
        showToast({
          style: Toast.Style.Success,
          title: "Mode Changed",
          message: `Successfully switched to ${mode.name}`,
        });
      } catch (error) {
        console.error("Error switching mode:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to change mode",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [updateCurrentMode]
  );

  const setupBackgroundRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    if (preferencesRef.current.enableBackgroundRefresh) {
      console.log("\n=== Setting up Background Refresh ===");

      intervalRef.current = setInterval(() => {
        if (isActiveRef.current) {
          updateCurrentMode();
        }
      }, REFRESH_INTERVAL_MS);
    }
  }, [updateCurrentMode]);

  // Fetch scenes from SmartThings API
  const loadScenes = useCallback(async () => {
    try {
      const response = await axios.get(
        `https://api.smartthings.com/v1/scenes?locationId=${preferences.locationId}`,
        {
          headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
          },
        }
      );

      console.log("Fetched Scenes:", response.data);
      setScenes(response.data.items);
    } catch (error) {
      console.error("Failed to load scenes:", error);
    }
  }, [preferences.apiToken, preferences.locationId]);

  // Execute a scene
  const handleSceneExecution = useCallback(
    async (sceneId: string, sceneName: string) => {
      try {
        await axios.post(`https://api.smartthings.com/v1/scenes/${sceneId}/execute`, null, {
          headers: {
            Authorization: `Bearer ${preferences.apiToken}`,
          },
        });
        showToast({
          style: Toast.Style.Success,
          title: "Scene Activated",
          message: `Successfully executed ${sceneName}`,
        });
      } catch (error) {
        console.error("Failed to execute scene:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Execute Scene",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [preferences.apiToken]
  );

  // Load lights from SmartThings API
  const loadLights = useCallback(async () => {
    try {
      const devices = await fetchDevices();
      const lightDevices = devices
        .filter((device) =>
          device.components?.some((component) =>
            component.categories?.some((category) => category.name === "Light")
          )
        )
        .map(
          (device): Device => ({
            deviceId: device.deviceId,
            label: device.label || device.deviceId,
            status: device.status,
            components: device.components?.map((component) => ({
              ...component,
              categories: component.categories || [],
            })),
          })
        );

      setLights(lightDevices);
      console.log("Fetched Lights:", lightDevices);
    } catch (error) {
      console.error("Failed to load lights:", error);
    }
  }, []);

  // Handle light toggle
  const handleLightToggle = useCallback(
    async (device: Device) => {
      try {
        const currentStatus = device.status?.switch?.switch?.value || "off";
        await toggleLight(device.deviceId, currentStatus);
        await loadLights(); // Refresh lights after toggle

        showToast({
          style: Toast.Style.Success,
          title: "Light Toggled",
          message: `${device.label} turned ${currentStatus === "on" ? "off" : "on"}`,
        });
      } catch (error) {
        console.error("Failed to toggle light:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Toggle Light",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [loadLights]
  );

  // Handle brightness change
  const handleBrightnessChange = useCallback(
    async (device: Device, level: number) => {
      try {
        await setLightLevel(device.deviceId, level);
        await loadLights(); // Refresh lights after change

        showToast({
          style: Toast.Style.Success,
          title: "Brightness Changed",
          message: `${device.label} set to ${level}%`,
        });
      } catch (error) {
        console.error("Failed to change brightness:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Change Brightness",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [loadLights]
  );

  useEffect(() => {
    isActiveRef.current = true;
    preferencesRef.current = preferences;

    console.log("\n=== Initializing Menu Bar Monitor ===");

    // Initial load of all data
    updateCurrentMode();
    loadModes();
    loadScenes();
    loadLights();
    setupBackgroundRefresh();

    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    preferences.enableBackgroundRefresh,
    setupBackgroundRefresh,
    updateCurrentMode,
    loadModes,
    loadScenes,
    loadLights,
  ]);

  return (
    <MenuBarExtra
      icon="smartthings_white.png"
      title={currentMode.name}
      tooltip={`Current Home Mode${preferences.enableBackgroundRefresh ? " (Auto-refresh: 1m)" : ""}`}
    >
      <MenuBarExtra.Section title="Switch Mode">
        {availableModes.map((mode) => (
          <MenuBarExtra.Item
            key={mode.id}
            title={mode.name}
            icon={{
              source: mode.id === currentMode.id ? Icon.CheckCircle : Icon.Circle,
              tintColor: mode.id === currentMode.id ? Color.Green : Color.SecondaryText,
            }}
            onAction={() => mode.id !== currentMode.id && handleModeSwitch(mode)}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Lights">
        {lights
          .sort((a, b) => {
            // First sort by status (on lights first)
            const aIsOn = a.status?.switch?.switch?.value === "on";
            const bIsOn = b.status?.switch?.switch?.value === "on";
            if (aIsOn !== bIsOn) return bIsOn ? 1 : -1;

            // Finally sort by name
            return a.label.localeCompare(b.label);
          })
          .map((device) => {
            const brightness = device.status?.switchLevel?.level?.value;
            const isDimmable = device.status?.switchLevel !== undefined;
            const displayTitle = isDimmable
              ? `${device.label} (${brightness || 0}%)`
              : device.label;

            return (
              <MenuBarExtra.Submenu
                key={device.deviceId}
                title={displayTitle}
                icon={{
                  source: Icon.LightBulb,
                  tintColor:
                    device.status?.switch?.switch?.value === "on"
                      ? Color.Green
                      : Color.SecondaryText,
                }}
              >
                <MenuBarExtra.Item
                  title={device.status?.switch?.switch?.value === "on" ? "Turn Off" : "Turn On"}
                  icon={Icon.Power}
                  onAction={() => handleLightToggle(device)}
                />
                {isDimmable && (
                  <>
                    <MenuBarExtra.Separator />
                    <MenuBarExtra.Item title="Brightness" />
                    <MenuBarExtra.Item
                      title="100%"
                      onAction={() => handleBrightnessChange(device, 100)}
                    />
                    <MenuBarExtra.Item
                      title="75%"
                      onAction={() => handleBrightnessChange(device, 75)}
                    />
                    <MenuBarExtra.Item
                      title="50%"
                      onAction={() => handleBrightnessChange(device, 50)}
                    />
                    <MenuBarExtra.Item
                      title="25%"
                      onAction={() => handleBrightnessChange(device, 25)}
                    />
                    <MenuBarExtra.Item
                      title="10%"
                      onAction={() => handleBrightnessChange(device, 10)}
                    />
                  </>
                )}
              </MenuBarExtra.Submenu>
            );
          })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Scenes">
        {scenes.map((scene) => (
          <MenuBarExtra.Item
            key={scene.sceneId}
            title={scene.sceneName}
            icon={Icon.Play}
            onAction={() => handleSceneExecution(scene.sceneId, scene.sceneName)}
            tooltip={
              scene.lastExecutedDate
                ? `Last executed: ${new Date(scene.lastExecutedDate).toLocaleString()}`
                : "Never executed"
            }
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
