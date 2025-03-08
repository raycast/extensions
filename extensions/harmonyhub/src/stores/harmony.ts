/**
 * Harmony Hub state management store
 * @module
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { ErrorHandler } from "../services/errorHandler";
import { HarmonyClient } from "../services/harmony/harmonyClient";
import { LocalStorage } from "../services/localStorage";
import { error, info } from "../services/logger";
import { ToastManager } from "../services/toast";
import {
  HarmonyHub,
  HarmonyDevice,
  HarmonyActivity,
  HarmonyCommand,
  HarmonyError,
  ErrorCategory,
  LoadingState,
  HarmonyStage,
} from "../types/core";
import {
  MutableHarmonyState,
  toMutableHub,
  toMutableDevice,
  toMutableActivity,
  toMutableLoadingState,
} from "../types/core/state-mutable";

/**
 * Actions that can be performed on the store
 */
interface HarmonyActions {
  // Hub Management
  discoverHubs: () => Promise<void>;
  selectHub: (hub: HarmonyHub) => Promise<void>;
  disconnectHub: () => Promise<void>;

  // Device Management
  loadDevices: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;

  // Activity Management
  loadActivities: () => Promise<void>;
  startActivity: (activity: HarmonyActivity) => Promise<void>;
  stopActivity: (activity: HarmonyActivity) => Promise<void>;

  // State Management
  setError: (error: HarmonyError | null) => void;
  clearError: () => void;
  setLoadingState: (state: LoadingState) => void;
  reset: () => void;
}

/**
 * Combined store type with state and actions
 */
type HarmonyStore = MutableHarmonyState & HarmonyActions;

/**
 * Create the Harmony store with Zustand and Immer
 */
export const useHarmonyStore = create<HarmonyStore>()(
  immer((set, get) => {
    // Load persisted state
    const loadPersistedState = async (): Promise<void> => {
      try {
        const persistedJSON = await LocalStorage.getItem("harmony-hub-state");
        if (persistedJSON) {
          const { state } = JSON.parse(persistedJSON);
          set((draft) => {
            if (state.selectedHub) {
              draft.selectedHub = toMutableHub(state.selectedHub);
            }
            if (state.hubs) {
              draft.hubs = state.hubs.map(toMutableHub);
            }
          });
          info("Loaded persisted hub state");
        }
      } catch (err) {
        error("Failed to load persisted hub state", err);
      }
    };

    // Save state changes
    const saveState = async (state: HarmonyStore): Promise<void> => {
      try {
        const persistedState = {
          selectedHub: state.selectedHub,
          hubs: state.hubs,
        };
        await LocalStorage.setItem("harmony-hub-state", JSON.stringify({ state: persistedState, version: 1 }));
        info("Saved hub state");
      } catch (err) {
        error("Failed to save hub state", err);
      }
    };

    // Initialize state
    loadPersistedState();

    return {
      // Initial State
      hubs: [],
      selectedHub: null,
      devices: [],
      activities: [],
      currentActivity: null,
      error: null,
      loadingState: {
        stage: HarmonyStage.INITIAL,
        progress: 0,
        message: "Ready",
      },

      // Hub Management Actions
      discoverHubs: async () => {
        try {
          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.DISCOVERING,
              progress: 0,
              message: "Discovering Harmony Hubs...",
            });
            state.error = null;
          });

          // TODO: Implement hub discovery
          const hubs: HarmonyHub[] = [];

          set((state) => {
            state.hubs = hubs.map(toMutableHub);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 1,
              message: `Found ${hubs.length} hub(s)`,
            });
          });
          saveState(get());

          ToastManager.success(`Found ${hubs.length} Harmony Hub(s)`);
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to discover hubs",
                  ErrorCategory.DISCOVERY,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Hub discovery failed");
          set((state) => {
            state.error = harmonyError;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.ERROR,
              progress: 1,
              message: "Hub discovery failed",
            });
          });
        }
      },

      selectHub: async (hub) => {
        try {
          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTING,
              progress: 0,
              message: `Connecting to ${hub.name}...`,
            });
            state.error = null;
          });

          // TODO: Implement hub connection

          set((state) => {
            state.selectedHub = toMutableHub(hub);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Connected to ${hub.name}`,
            });
          });
          saveState(get());

          // Load devices and activities
          await get().loadDevices();
          await get().loadActivities();

          ToastManager.success(`Connected to ${hub.name}`);
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to connect to hub",
                  ErrorCategory.CONNECTION,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Hub connection failed");
          set((state) => {
            state.error = harmonyError;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.ERROR,
              progress: 1,
              message: "Connection failed",
            });
          });
        }
      },

      disconnectHub: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) return;

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 0,
              message: "Disconnecting...",
            });
          });

          // TODO: Implement hub disconnection

          set((state) => {
            state.selectedHub = null;
            state.devices = [];
            state.activities = [];
            state.currentActivity = null;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.INITIAL,
              progress: 1,
              message: "Disconnected",
            });
          });
          saveState(get());

          ToastManager.success("Disconnected from Harmony Hub");
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to disconnect",
                  ErrorCategory.CONNECTION,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Hub disconnection failed");
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      // Device Management Actions
      loadDevices: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.LOADING_DEVICES,
              progress: 0,
              message: "Loading devices...",
            });
          });

          // TODO: Implement device loading
          const devices: HarmonyDevice[] = [];

          set((state) => {
            state.devices = devices.map(toMutableDevice);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Loaded ${devices.length} devices`,
            });
          });
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to load devices",
                  ErrorCategory.DATA,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Device loading failed");
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      executeCommand: async (command) => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          const client = await HarmonyClient.getClient(selectedHub);
          await client.executeCommand(command);
          ToastManager.success(`Executed ${command.label}`);
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to execute command",
                  ErrorCategory.COMMAND,
                  error instanceof Error ? error : undefined,
                );
          ToastManager.error(`Failed to execute ${command.label}`, harmonyError.message);
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      // Activity Management Actions
      loadActivities: async () => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.LOADING_ACTIVITIES,
              progress: 0,
              message: "Loading activities...",
            });
          });

          // TODO: Implement activity loading
          const activities: HarmonyActivity[] = [];

          set((state) => {
            state.activities = activities.map(toMutableActivity);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Loaded ${activities.length} activities`,
            });
          });
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to load activities",
                  ErrorCategory.DATA,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Activity loading failed");
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      startActivity: async (activity) => {
        try {
          const { selectedHub } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.STARTING_ACTIVITY,
              progress: 0,
              message: `Starting activity: ${activity.name}`,
            });
          });

          // TODO: Implement activity start

          set((state) => {
            state.currentActivity = toMutableActivity(activity);
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Started activity: ${activity.name}`,
            });
          });

          ToastManager.success(`Started activity: ${activity.name}`);
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to start activity",
                  ErrorCategory.COMMAND,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Activity start failed");
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      stopActivity: async (activity) => {
        try {
          const { selectedHub, currentActivity } = get();
          if (!selectedHub) {
            throw new HarmonyError("No hub selected", ErrorCategory.STATE);
          }
          if (!currentActivity) {
            throw new HarmonyError("No activity is running", ErrorCategory.STATE);
          }

          set((state) => {
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.STOPPING_ACTIVITY,
              progress: 0,
              message: `Stopping activity: ${activity.name}`,
            });
          });

          // TODO: Implement activity stop

          set((state) => {
            state.currentActivity = null;
            state.loadingState = toMutableLoadingState({
              stage: HarmonyStage.CONNECTED,
              progress: 1,
              message: `Stopped activity: ${activity.name}`,
            });
          });

          ToastManager.success(`Stopped activity: ${activity.name}`);
        } catch (error) {
          const harmonyError =
            error instanceof HarmonyError
              ? error
              : new HarmonyError(
                  "Failed to stop activity",
                  ErrorCategory.COMMAND,
                  error instanceof Error ? error : undefined,
                );
          ErrorHandler.handle(harmonyError, "Activity stop failed");
          set((state) => {
            state.error = harmonyError;
          });
        }
      },

      // State Management Actions
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      setLoadingState: (loadingState) => {
        set((state) => {
          state.loadingState = toMutableLoadingState(loadingState);
        });
      },

      reset: () => {
        set((state) => {
          state.hubs = [];
          state.selectedHub = null;
          state.devices = [];
          state.activities = [];
          state.currentActivity = null;
          state.error = null;
          state.loadingState = toMutableLoadingState({
            stage: HarmonyStage.INITIAL,
            progress: 0,
            message: "Ready",
          });
        });
        saveState(get());
      },
    };
  }),
);

// Export selectors for common state derivations
export const selectHubs = (state: HarmonyStore): readonly HarmonyHub[] => state.hubs;
export const selectSelectedHub = (state: HarmonyStore): HarmonyHub | null => state.selectedHub;
export const selectDevices = (state: HarmonyStore): readonly HarmonyDevice[] => state.devices;
export const selectActivities = (state: HarmonyStore): readonly HarmonyActivity[] => state.activities;
export const selectCurrentActivity = (state: HarmonyStore): HarmonyActivity | null => state.currentActivity;
export const selectError = (state: HarmonyStore): HarmonyError | null => state.error as HarmonyError | null;
export const selectLoadingState = (state: HarmonyStore): LoadingState => ({
  stage: state.loadingState.stage as HarmonyStage,
  progress: state.loadingState.progress,
  message: state.loadingState.message,
});
export const selectIsLoading = (state: HarmonyStore): boolean =>
  state.loadingState.stage !== HarmonyStage.INITIAL &&
  state.loadingState.stage !== HarmonyStage.CONNECTED &&
  state.loadingState.stage !== HarmonyStage.ERROR;
