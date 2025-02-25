/**
 * View state management store
 * @module
 */

import { getPreferenceValues } from "@raycast/api";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { LocalStorage } from "../services/localStorage";
import { debug, error, info } from "../services/logger";
import { HarmonyDevice, HarmonyActivity } from "../types/core/harmony";
import { View, ViewFilters, ViewActions, MutableViewState } from "../types/core/views";
import { Preferences } from "../types/preferences";
import { toMutableDevice, toMutableActivity } from "../utils/state";

/**
 * Combined store type with state and actions
 */
type ViewStore = MutableViewState & ViewActions;

/**
 * Create a debounced function
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 */
function debounce(fn: (state: ViewStore) => void, delay: number): (state: ViewStore) => void {
  let timeoutId: NodeJS.Timeout;
  return (state: ViewStore) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(state);
    }, delay);
  };
}

// Create debounced save function
const debouncedSave = debounce(async (state: ViewStore) => {
  try {
    const persistedState = {
      filters: state.filters,
    };
    await LocalStorage.setItem("harmony-view-state", JSON.stringify({ state: persistedState, version: 1 }));
    debug("Saved view state");
  } catch (err) {
    error("Failed to save view state", err);
  }
}, 1000);

/**
 * Create the view store with Zustand and Immer
 */
export const useViewStore = create<ViewStore>()(
  immer((set, get) => {
    const preferences = getPreferenceValues<Preferences>();
    debug("Initializing view store with preferences", { defaultView: preferences.defaultView });

    // Load persisted state
    const loadPersistedState = async (): Promise<void> => {
      try {
        const persistedJSON = await LocalStorage.getItem("harmony-view-state");
        if (persistedJSON) {
          const { state } = JSON.parse(persistedJSON);
          set((draft) => {
            // Don't override the default view from preferences
            draft.filters = state.filters;
          });
          info("Loaded persisted view state");
        }
      } catch (err) {
        error("Failed to load persisted view state", err);
      }
    };

    // Initialize state
    loadPersistedState();

    const initialView = preferences.defaultView === "activities" ? View.ACTIVITIES : View.DEVICES;
    debug("Setting initial view", { initialView });

    return {
      // Initial State
      currentView: initialView,
      selectedDevice: null,
      selectedActivity: null,
      searchQuery: "",
      filters: {
        deviceType: undefined,
        activityType: undefined,
        showFavorites: false,
      },

      // View Actions
      changeView: (view: View) => {
        set((state: MutableViewState) => {
          // If transitioning from hubs view after connection, use the preferred view
          if (state.currentView === View.HUBS && view === View.DEVICES) {
            const preferences = getPreferenceValues<Preferences>();
            state.currentView = preferences.defaultView === "activities" ? View.ACTIVITIES : View.DEVICES;
          } else {
            state.currentView = view;
          }

          // Clear selection when changing views
          if (view !== View.DEVICE_DETAIL) {
            state.selectedDevice = null;
          }
          if (view !== View.ACTIVITY_DETAIL) {
            state.selectedActivity = null;
          }
          // Clear search and filters
          state.searchQuery = "";
          state.filters = {
            deviceType: undefined,
            activityType: undefined,
            showFavorites: false,
          };
        });
        debouncedSave(get());
      },

      selectDevice: (device: HarmonyDevice) => {
        debug("Selecting device in store", { device });
        set((state: MutableViewState) => {
          state.selectedDevice = toMutableDevice(device);
          state.currentView = View.DEVICE_DETAIL;
        });
        debouncedSave(get());
      },

      selectActivity: (activity: HarmonyActivity) => {
        set((state: MutableViewState) => {
          state.selectedActivity = toMutableActivity(activity);
          state.currentView = View.ACTIVITY_DETAIL;
        });
        debouncedSave(get());
      },

      clearSelection: () => {
        set((state: MutableViewState) => {
          if (state.currentView === View.DEVICE_DETAIL) {
            state.currentView = View.DEVICES;
            state.selectedDevice = null;
          } else if (state.currentView === View.ACTIVITY_DETAIL) {
            state.currentView = View.ACTIVITIES;
            state.selectedActivity = null;
          }
        });
        debouncedSave(get());
      },

      setSearch: (query: string) => {
        set((state: MutableViewState) => {
          state.searchQuery = query;
        });
      },

      setFilters: (filters: Partial<ViewFilters>) => {
        set((state: MutableViewState) => {
          state.filters = {
            ...state.filters,
            ...filters,
          };
        });
        debouncedSave(get());
      },
    };
  }),
);

// Selectors
export const selectCurrentView = (state: ViewStore): View => state.currentView;
export const selectSelectedDevice = (state: ViewStore): HarmonyDevice | null => state.selectedDevice;
export const selectSelectedActivity = (state: ViewStore): HarmonyActivity | null => state.selectedActivity;
export const selectSearchQuery = (state: ViewStore): string => state.searchQuery;
export const selectFilters = (state: ViewStore): ViewFilters => state.filters;

// Derived selectors
export const selectIsDetailView = (state: ViewStore): boolean =>
  state.currentView === View.DEVICE_DETAIL || state.currentView === View.ACTIVITY_DETAIL;

export const selectCanGoBack = (state: ViewStore): boolean =>
  state.currentView === View.DEVICE_DETAIL || state.currentView === View.ACTIVITY_DETAIL;
