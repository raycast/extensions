import { showToast, Toast } from "@raycast/api";
import React, { useCallback, useEffect, useState, createContext, useContext, useRef } from "react";

import { HarmonyClient } from "../services/harmony/harmonyClient";
import { HarmonyManager } from "../services/harmony/harmonyManager";
import { Logger } from "../services/logger";
import { HarmonyError, ErrorCategory } from "../types/errors";
import {
  HarmonyHub,
  HarmonyDevice,
  HarmonyActivity,
  HarmonyCommand,
  LoadingState,
  HarmonyStage,
} from "../types/harmony";

// Create a single manager instance
const manager = new HarmonyManager();

interface HarmonyContextState {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  error: HarmonyError | null;
  loadingState: LoadingState;
  connect: (hub: HarmonyHub) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
  clearCache: () => Promise<void>;
  startActivity: (activityId: string) => Promise<void>;
  stopActivity: () => Promise<void>;
}

const HarmonyContext = createContext<HarmonyContextState | null>(null);

interface HarmonyProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for Harmony Hub functionality
 */
export const HarmonyProvider: React.FC<HarmonyProviderProps> = ({ children }) => {
  const harmony = useHarmonyState();
  return React.createElement(HarmonyContext.Provider, { value: harmony }, children);
};

/**
 * Hook for managing Harmony Hub state and operations
 */
function useHarmonyState(): HarmonyContextState {
  const [hubs, setHubs] = useState<HarmonyHub[]>([]);
  const [selectedHub, setSelectedHub] = useState<HarmonyHub | null>(null);
  const [client, setClient] = useState<HarmonyClient | null>(null);
  const [devices, setDevices] = useState<HarmonyDevice[]>([]);
  const [activities, setActivities] = useState<HarmonyActivity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<HarmonyActivity | null>(null);
  const [error, setError] = useState<HarmonyError | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: HarmonyStage.INITIAL,
    message: "Starting hub discovery",
    progress: 0,
  });

  // Use ref to track if discovery is in progress
  const isDiscovering = useRef(false);

  // Connect to a hub
  const connect = useCallback(async (hub: HarmonyHub) => {
    try {
      setError(null);
      setSelectedHub(hub);

      setLoadingState({
        stage: HarmonyStage.CONNECTING,
        message: `Connecting to ${hub.name}...`,
        progress: 0.3,
      });

      const hubClient = new HarmonyClient(hub);
      await hubClient.connect();
      setClient(hubClient);

      setLoadingState({
        stage: HarmonyStage.LOADING_DEVICES,
        message: "Loading devices and activities...",
        progress: 0.6,
      });

      const [hubDevices, hubActivities, current] = await Promise.all([
        hubClient.getDevices(),
        hubClient.getActivities(),
        hubClient.getCurrentActivity(),
      ]);

      setDevices(hubDevices);
      setActivities(hubActivities);
      setCurrentActivity(current);

      setLoadingState({
        stage: HarmonyStage.CONNECTED,
        message: "Connected successfully",
        progress: 1,
      });
    } catch (err) {
      const error = new HarmonyError(
        "Failed to connect to hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
      setError(error);
      setLoadingState({
        stage: HarmonyStage.ERROR,
        message: error.message,
        progress: 1,
      });
      throw error;
    }
  }, []);

  // Discover hubs
  const discover = useCallback(async () => {
    // Prevent multiple discoveries
    if (isDiscovering.current) {
      return;
    }

    try {
      isDiscovering.current = true;
      setError(null);

      // Show initial loading state
      setLoadingState({
        stage: HarmonyStage.DISCOVERING,
        message: "Searching for Harmony Hubs...",
        progress: 0.1,
      });

      const discoveredHubs = await manager.startDiscovery(async (progress, message) => {
        setLoadingState({
          stage: HarmonyStage.DISCOVERING,
          message,
          progress: Math.max(0.1, progress),
        });
      });

      if (!isDiscovering.current) {
        // Discovery was cancelled
        return;
      }

      setHubs(discoveredHubs);

      if (discoveredHubs.length === 0) {
        const error = new HarmonyError("No Harmony Hubs found", ErrorCategory.HUB_COMMUNICATION);
        setError(error);
        setLoadingState({
          stage: HarmonyStage.ERROR,
          message: error.message,
          progress: 1,
        });
        throw error;
      }

      // If we have cached hubs, we're ready to connect
      setLoadingState({
        stage: HarmonyStage.INITIAL,
        message: `Found ${discoveredHubs.length} hub(s)`,
        progress: 1,
      });

      // If there's only one hub, auto-select it
      if (discoveredHubs.length === 1) {
        await connect(discoveredHubs[0]);
      }
    } catch (error) {
      if (!isDiscovering.current) {
        return;
      }

      const harmonyError = error instanceof HarmonyError
        ? error
        : new HarmonyError("Discovery failed", ErrorCategory.HUB_COMMUNICATION, error as Error);

      setError(harmonyError);
      setLoadingState({
        stage: HarmonyStage.ERROR,
        message: harmonyError.message,
        progress: 1,
      });

      // Show error toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Discovery failed",
        message: harmonyError.message,
      });
    } finally {
      isDiscovering.current = false;
    }
  }, [connect]);

  // Disconnect from hub
  const disconnect = useCallback(async () => {
    if (client) {
      try {
        await client.disconnect();
        setLoadingState({
          stage: HarmonyStage.INITIAL,
          message: "Disconnected",
          progress: 0,
        });
      } catch (err) {
        const error = new HarmonyError(
          "Failed to disconnect",
          ErrorCategory.HUB_COMMUNICATION,
          err instanceof Error ? err : undefined,
        );
        Logger.error("Hub disconnection failed", error);
      } finally {
        setClient(null);
        setSelectedHub(null);
        setDevices([]);
        setActivities([]);
        setCurrentActivity(null);
        setError(null);
      }
    }
  }, [client]);

  // Execute a command
  const executeCommand = useCallback(
    async (command: HarmonyCommand) => {
      if (!client) {
        throw new HarmonyError("No hub selected", ErrorCategory.STATE);
      }

      try {
        Logger.debug("Sending command to hub", { command });
        setLoadingState({
          stage: HarmonyStage.EXECUTING_COMMAND,
          message: `Sending ${command.name}...`,
          progress: 0.5,
        });
        await client.executeCommand(command);
        setLoadingState({
          stage: HarmonyStage.CONNECTED,
          message: "Command sent successfully",
          progress: 1,
        });
      } catch (err) {
        const error = new HarmonyError(
          "Failed to execute command",
          ErrorCategory.COMMAND_EXECUTION,
          err instanceof Error ? err : undefined,
        );
        setError(error);
        setLoadingState({
          stage: HarmonyStage.ERROR,
          message: error.message,
          progress: 1,
        });
        throw error;
      }
    },
    [client],
  );

  // Refresh hub state
  const refresh = useCallback(async () => {
    if (!client || !selectedHub) {
      return;
    }

    try {
      setError(null);
      setLoadingState({
        stage: HarmonyStage.REFRESHING,
        message: "Refreshing hub state...",
        progress: 0,
      });

      const [hubDevices, hubActivities, current] = await Promise.all([
        client.getDevices(),
        client.getActivities(),
        client.getCurrentActivity(),
      ]);

      setDevices(hubDevices);
      setActivities(hubActivities);
      setCurrentActivity(current);

      setLoadingState({
        stage: HarmonyStage.CONNECTED,
        message: "Refresh complete",
        progress: 1,
      });
    } catch (err) {
      const error = new HarmonyError(
        "Failed to refresh hub state",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
      setError(error);
      setLoadingState({
        stage: HarmonyStage.ERROR,
        message: error.message,
        progress: 1,
      });
      Logger.error("Hub refresh failed", error);
    }
  }, [client, selectedHub]);

  // Start an activity
  const startActivity = useCallback(
    async (activityId: string) => {
      if (!client) {
        throw new HarmonyError("No hub selected", ErrorCategory.STATE);
      }

      try {
        setLoadingState({
          stage: HarmonyStage.STARTING_ACTIVITY,
          message: `Starting activity ${activityId}...`,
          progress: 0.5,
        });
        await client.startActivity(activityId);
        setLoadingState({
          stage: HarmonyStage.CONNECTED,
          message: "Activity started successfully",
          progress: 1,
        });
      } catch (err) {
        const error = new HarmonyError(
          "Failed to start activity",
          ErrorCategory.ACTIVITY_START,
          err instanceof Error ? err : undefined,
        );
        setError(error);
        setLoadingState({
          stage: HarmonyStage.ERROR,
          message: error.message,
          progress: 1,
        });
        throw error;
      }
    },
    [client],
  );

  // Stop the current activity
  const stopActivity = useCallback(async () => {
    if (!client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    try {
      setLoadingState({
        stage: HarmonyStage.STOPPING_ACTIVITY,
        message: "Stopping activity...",
        progress: 0.5,
      });
      await client.stopActivity();
      setLoadingState({
        stage: HarmonyStage.CONNECTED,
        message: "Activity stopped successfully",
        progress: 1,
      });
    } catch (err) {
      const error = new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.ACTIVITY_STOP,
        err instanceof Error ? err : undefined,
      );
      setError(error);
      setLoadingState({
        stage: HarmonyStage.ERROR,
        message: error.message,
        progress: 1,
      });
      throw error;
    }
  }, [client]);

  // Clear cache and rediscover
  const clearCache = useCallback(async () => {
    await disconnect();
    await manager.clearCache();
    await discover();
  }, [disconnect, discover]);

  // Initial discovery
  useEffect(() => {
    discover();
    return () => {
      isDiscovering.current = false;
    };
  }, [discover]);

  return {
    hubs,
    selectedHub,
    devices,
    activities,
    currentActivity,
    error,
    loadingState,
    connect,
    disconnect,
    refresh,
    executeCommand,
    clearCache,
    startActivity,
    stopActivity,
  };
}

/**
 * Hook for accessing Harmony Hub functionality
 */
export function useHarmony(): HarmonyContextState {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmony must be used within a HarmonyProvider");
  }
  return context;
}
