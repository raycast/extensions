/**
 * Core hook for managing Harmony Hub state and operations.
 * Provides centralized access to hub, device, and activity management.
 * @module
 */

import { getPreferenceValues } from "@raycast/api";
import React, { useCallback, useState, createContext, useContext, useRef } from "react";

import { HarmonyClient } from "../services/harmony/harmonyClient";
import { HarmonyManager } from "../services/harmony/harmonyManager";
import { debug, error, info } from "../services/logger";
import { HarmonyError, ErrorCategory } from "../types/core/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand, LoadingState } from "../types/core/harmony";
import { Preferences } from "../types/core/preferences";
import { HarmonyStage, HarmonyState } from "../types/core/state";

// Create a single manager instance
const manager = new HarmonyManager();

// Add state cache interfaces
interface CachedHubData {
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  timestamp: number;
}

// Add state cache at module level
const hubDataCache = new Map<string, CachedHubData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Update state interface to include proper client type
interface HarmonyStateWithClient extends Omit<HarmonyState, "client"> {
  client: HarmonyClient | null;
}

/**
 * Core state and operations for Harmony Hub integration.
 * Provides access to hub state, devices, activities, and operations.
 * @interface HarmonyContextState
 */
interface HarmonyContextState {
  /** List of discovered Harmony Hubs */
  readonly hubs: readonly HarmonyHub[];
  /** Currently selected Harmony Hub */
  readonly selectedHub: HarmonyHub | null;
  /** List of devices available on the selected hub */
  readonly devices: readonly HarmonyDevice[];
  /** List of activities available on the selected hub */
  readonly activities: readonly HarmonyActivity[];
  /** Currently running activity */
  readonly currentActivity: HarmonyActivity | null;
  /** Current error state */
  readonly error: HarmonyError | null;
  /** Current loading state */
  readonly loadingState: LoadingState;
  /** Connect to a specific Harmony Hub */
  connect: (hub: HarmonyHub) => Promise<void>;
  /** Disconnect from the current hub */
  disconnect: () => Promise<void>;
  /** Refresh hub discovery and state */
  refresh: () => Promise<void>;
  /** Execute a command on a device */
  executeCommand: (command: HarmonyCommand) => Promise<void>;
  /** Clear cached hub data */
  clearCache: () => Promise<void>;
  /** Start an activity by ID */
  startActivity: (activityId: string) => Promise<void>;
  /** Stop the current activity */
  stopActivity: () => Promise<void>;
}

/** Context for sharing Harmony state across components */
const HarmonyContext = createContext<HarmonyContextState | null>(null);

/**
 * Props for the HarmonyProvider component
 * @interface HarmonyProviderProps
 */
interface HarmonyProviderProps {
  /** Child components that will have access to Harmony state */
  children: React.ReactNode;
}

/**
 * Provider component for Harmony Hub functionality.
 * Wraps child components with access to Harmony state and operations.
 * @param props - The provider props
 * @returns A provider component
 */
export const HarmonyProvider: React.FC<HarmonyProviderProps> = ({ children }) => {
  const harmony = useHarmonyState();
  return React.createElement(HarmonyContext.Provider, { value: harmony }, children);
};

/**
 * Hook for managing Harmony Hub state and operations.
 * This is the internal implementation used by the provider.
 * Handles hub discovery, connection, device and activity management.
 * @returns The Harmony context state
 */
function useHarmonyState(): HarmonyContextState {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<HarmonyStateWithClient>({
    hubs: [],
    selectedHub: null,
    devices: [],
    activities: [],
    currentActivity: null,
    error: null,
    client: null,
    loadingState: {
      stage: HarmonyStage.INITIAL,
      progress: 0,
      message: "Ready",
    },
  });

  // Use ref to track if discovery is in progress
  const isDiscovering = useRef(false);

  // Add function to check if cached data is valid
  const isCacheValid = useCallback((hubId: string) => {
    const cached = hubDataCache.get(hubId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
  }, []);

  // Add function to update cache
  const updateCache = useCallback((hubId: string, data: Partial<CachedHubData>) => {
    const existing = hubDataCache.get(hubId) || {
      devices: [],
      activities: [],
      currentActivity: null,
      timestamp: 0,
    };
    hubDataCache.set(hubId, {
      ...existing,
      ...data,
      timestamp: Date.now(),
    });
    debug(`Updated cache for hub ${hubId}`);
  }, []);

  /**
   * Update the current loading state
   * @param stage - The current stage of operation
   * @param message - User-friendly message about the current state
   * @param progress - Progress value between 0 and 1
   */
  const setLoadingState = useCallback((stage: HarmonyStage, message: string, progress: number) => {
    setState((prev) => ({
      ...prev,
      loadingState: { stage, message, progress },
    }));
  }, []);

  /**
   * Update the current error state
   * @param error - The current error or null if cleared
   */
  const setError = useCallback((error: HarmonyError | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Connect to a hub
  const connect = useCallback(
    async (hub: HarmonyHub) => {
      try {
        // Check if we're already connected to this hub
        if (state.selectedHub?.hubId === hub.hubId && state.client?.isClientConnected()) {
          debug(`Already connected to hub ${hub.name}`);
          return;
        }

        info(`Connecting to hub ${hub.name}`);
        setError(null);
        setLoadingState(HarmonyStage.CONNECTING, `Connecting to ${hub.name}...`, 0);

        // Get or create client
        const client = HarmonyClient.getClient(hub);

        // Only connect if not already connected
        if (!client.isClientConnected()) {
          await client.connect();
        }

        info("Connected to hub, setting up state");
        setState((prev) => ({
          ...prev,
          client,
          selectedHub: hub,
        }));

        // Check cache for devices and activities
        const cached = hubDataCache.get(hub.hubId);
        const isCached = isCacheValid(hub.hubId);

        if (isCached && cached) {
          info("Using cached data");
          setState((prev) => ({
            ...prev,
            devices: cached.devices,
            activities: cached.activities,
          }));
        } else {
          // Load devices
          setLoadingState(HarmonyStage.LOADING_DEVICES, "Loading devices...", 0.3);
          info("Loading devices");
          const hubDevices = await client.getDevices();
          info(`Loaded ${hubDevices.length} devices`);
          setState((prev) => ({ ...prev, devices: hubDevices }));

          // Load activities
          setLoadingState(HarmonyStage.LOADING_ACTIVITIES, "Loading activities...", 0.6);
          info("Loading activities");
          const hubActivities = await client.getActivities();
          info(`Loaded ${hubActivities.length} activities`);
          setState((prev) => ({ ...prev, activities: hubActivities }));

          // Update cache
          updateCache(hub.hubId, {
            devices: hubDevices,
            activities: hubActivities,
            currentActivity: null,
          });
        }

        // Always get current activity as it may have changed
        info("Getting current activity");
        const current = await client.getCurrentActivity();
        setState((prev) => ({ ...prev, currentActivity: current }));
        updateCache(hub.hubId, { currentActivity: current });

        setLoadingState(HarmonyStage.CONNECTED, "Connected successfully", 1);
        info("Hub setup completed successfully");
      } catch (err) {
        const harmonyError = new HarmonyError(
          "Failed to connect to hub",
          ErrorCategory.HUB_COMMUNICATION,
          err instanceof Error ? err : undefined,
        );
        setError(harmonyError);
        setLoadingState(HarmonyStage.ERROR, harmonyError.message, 1);
        error("Hub connection failed", { error: harmonyError.getDetailedMessage() });
      }
    },
    [state, setLoadingState, setError, isCacheValid, updateCache],
  );

  // Discover hubs
  const discover = useCallback(async () => {
    if (isDiscovering.current) {
      info("Discovery already in progress, skipping");
      return;
    }

    isDiscovering.current = true;

    try {
      setLoadingState(HarmonyStage.DISCOVERING, "Searching for Harmony Hubs...", 0.1);

      info("Starting hub discovery");
      const discoveredHubs = await manager.startDiscovery((progress, message) => {
        setLoadingState(HarmonyStage.DISCOVERING, message, Math.max(0.1, progress));
      });

      if (!isDiscovering.current) {
        info("Discovery was cancelled");
        return;
      }

      info(`Discovery completed, found ${discoveredHubs.length} hubs`);
      setState((prev) => ({ ...prev, hubs: discoveredHubs }));

      // Set to initial state after discovery completes
      setLoadingState(HarmonyStage.INITIAL, `Found ${discoveredHubs.length} hub(s)`, 1);

      // If auto-connect is enabled and we found exactly one hub, connect to it
      if (preferences.autoConnect && discoveredHubs.length === 1) {
        const hub = discoveredHubs[0];
        if (hub) {
          info("Single hub found, auto-selecting");
          await connect(hub);
        }
      }
    } catch (err) {
      const harmonyError =
        error instanceof HarmonyError
          ? error
          : new HarmonyError(
              "Failed to discover hubs",
              ErrorCategory.HUB_COMMUNICATION,
              err instanceof Error ? err : undefined,
            );
      setError(harmonyError);
      setLoadingState(HarmonyStage.ERROR, harmonyError.message, 1);
      error("Hub discovery failed", { error: harmonyError.getDetailedMessage() });
    } finally {
      isDiscovering.current = false;
    }
  }, [connect, setLoadingState, setError, preferences.autoConnect]);

  // Disconnect from hub
  const disconnect = useCallback(async () => {
    if (state.client && state.selectedHub) {
      try {
        await state.client.disconnect();
        // Clear cache for this hub
        hubDataCache.delete(state.selectedHub.hubId);
        setState((prev) => ({
          ...prev,
          client: null,
          devices: [],
          activities: [],
          currentActivity: null,
        }));
      } catch (err) {
        const harmonyError = new HarmonyError(
          "Failed to disconnect from hub",
          ErrorCategory.HUB_COMMUNICATION,
          err instanceof Error ? err : undefined,
        );
        error("Hub disconnection failed", { error: harmonyError.getDetailedMessage() });
      }
    }
  }, [state.client, state.selectedHub]);

  // Execute a command
  const executeCommand = useCallback(
    async (command: HarmonyCommand) => {
      if (!state.client) {
        throw new HarmonyError("No hub selected", ErrorCategory.STATE);
      }

      try {
        debug("Sending command to hub", { command });
        setLoadingState(HarmonyStage.EXECUTING_COMMAND, `Sending ${command.name}...`, 0.5);
        await state.client.executeCommand(command);
        setLoadingState(HarmonyStage.CONNECTED, "Command sent successfully", 1);
      } catch (err) {
        const error = new HarmonyError(
          "Failed to execute command",
          ErrorCategory.COMMAND_EXECUTION,
          err instanceof Error ? err : undefined,
        );
        setError(error);
        setLoadingState(HarmonyStage.ERROR, error.message, 1);
        throw error;
      }
    },
    [state.client, setLoadingState, setError],
  );

  // Start activity
  const startActivity = useCallback(
    async (activityId: string) => {
      if (!state.client) {
        throw new HarmonyError("No hub selected", ErrorCategory.STATE);
      }

      try {
        setLoadingState(HarmonyStage.STARTING_ACTIVITY, `Starting activity ${activityId}...`, 0.5);
        await state.client.startActivity(activityId);
        setLoadingState(HarmonyStage.CONNECTED, "Activity started successfully", 1);
      } catch (err) {
        const error = new HarmonyError(
          "Failed to start activity",
          ErrorCategory.ACTIVITY_START,
          err instanceof Error ? err : undefined,
        );
        setError(error);
        setLoadingState(HarmonyStage.ERROR, error.message, 1);
        throw error;
      }
    },
    [state.client, setLoadingState, setError],
  );

  // Stop activity
  const stopActivity = useCallback(async () => {
    if (!state.client) {
      throw new HarmonyError("No hub selected", ErrorCategory.STATE);
    }

    try {
      setLoadingState(HarmonyStage.STOPPING_ACTIVITY, "Stopping activity...", 0.5);
      await state.client.stopActivity();
      setLoadingState(HarmonyStage.CONNECTED, "Activity stopped successfully", 1);
    } catch (err) {
      const error = new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.ACTIVITY_STOP,
        err instanceof Error ? err : undefined,
      );
      setError(error);
      setLoadingState(HarmonyStage.ERROR, error.message, 1);
      throw error;
    }
  }, [state.client, setLoadingState, setError]);

  // Update clearCache to clear memory cache
  const clearCache = useCallback(async () => {
    hubDataCache.clear();
    await disconnect();
    await manager.clearCache();
    await discover();
  }, [disconnect, discover]);

  // Refresh state
  const refresh = useCallback(async () => {
    await discover();
  }, [discover]);

  return {
    hubs: state.hubs,
    selectedHub: state.selectedHub,
    devices: state.devices,
    activities: state.activities,
    currentActivity: state.currentActivity,
    error: state.error as HarmonyError | null,
    loadingState: state.loadingState,
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
 * Hook for accessing Harmony Hub functionality.
 * Must be used within a HarmonyProvider component.
 * Provides access to hub state, devices, activities, and operations.
 * @throws {Error} If used outside of a HarmonyProvider
 * @returns The Harmony context state
 */
export function useHarmony(): HarmonyContextState {
  const context = useContext(HarmonyContext);
  if (!context) {
    throw new Error("useHarmony must be used within a HarmonyProvider");
  }
  return context;
}
