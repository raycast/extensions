import { useEffect, useState, useCallback, useRef } from "react";
import { getPreferenceValues, showToast, Toast, LocalStorage } from "@raycast/api";
import { MirAIeHub, MirAIeBroker, Device } from "../lib/miraie";
import type { DeviceJSON } from "../lib/miraie/device";

interface MirAIeState {
  hub: MirAIeHub | null;
  broker: MirAIeBroker | null;
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

// Singleton instances - shared across all hook instances
let sharedHub: MirAIeHub | null = null;
let sharedBroker: MirAIeBroker | null = null;
let initializationPromise: Promise<void> | null = null;
let isInitializing = false;

export function useMirAIe() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<MirAIeState>({
    hub: sharedHub,
    broker: sharedBroker,
    devices: sharedHub?.home?.devices || [],
    isLoading: !sharedHub,
    error: null,
    isConnected: !!sharedBroker?.client,
  });

  const initCountRef = useRef(0);
  const lastErrorToastTimeRef = useRef(0);

  const initialize = useCallback(
    async (forceRefresh = false) => {
      // 0. Ensure credentials are present
      if (!preferences.username || !preferences.password) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Credentials missing. Please update preferences.",
        }));
        return;
      }

      // 1. Try to load from cache first for instant UI
      if (!sharedHub && !forceRefresh) {
        const cachedDevicesJson = await LocalStorage.getItem<string>("miraie_devices_cache");

        if (cachedDevicesJson) {
          try {
            sharedBroker = sharedBroker || new MirAIeBroker();
            const broker = sharedBroker;
            const parsedDevices = JSON.parse(cachedDevicesJson) as DeviceJSON[];
            const devices = parsedDevices.map((device) => Device.fromJSON(device, broker));

            setState((prev) => ({
              ...prev,
              broker,
              devices,
              isConnected: broker.isConnected(),
              isLoading: true,
            }));
          } catch {
            await LocalStorage.removeItem("miraie_devices_cache");
          }
        }
      }

      // Prevent multiple simultaneous initializations
      if (isInitializing) {
        if (initializationPromise) {
          await initializationPromise;
          setState({
            hub: sharedHub,
            broker: sharedBroker,
            devices: sharedHub?.home?.devices || [],
            isLoading: false,
            error: null,
            isConnected: sharedBroker?.isConnected() ?? false,
          });
        }
        return;
      }

      // If already initialized and not forcing refresh, just update state
      if (sharedHub && sharedBroker && !forceRefresh) {
        // If credentials have changed, we need to re-initialize everything
        if (sharedHub.username !== preferences.username || sharedHub.password !== preferences.password) {
          cleanupMirAIe();
        } else {
          setState({
            hub: sharedHub,
            broker: sharedBroker,
            devices: sharedHub.home.devices,
            isLoading: false,
            error: null,
            isConnected: sharedBroker.isConnected(),
          });
          return;
        }
      }

      initCountRef.current++;

      isInitializing = true;

      initializationPromise = (async () => {
        try {
          const isBackgroundInit = !forceRefresh && state.devices.length > 0;

          if (!isBackgroundInit) {
            setState((prev) => ({ ...prev, isLoading: true, error: null }));
          }

          const broker = sharedBroker || new MirAIeBroker();
          const hub = sharedHub || new MirAIeHub();

          // If we have devices (from cache or sharedHub) and no force refresh,
          // we can do a lighter background update
          if (isBackgroundInit && sharedHub) {
            await hub.getAllDeviceStatus(true);
          } else {
            await hub.init(preferences.username, preferences.password, broker);
          }

          // Store in shared instances
          sharedHub = hub;
          sharedBroker = broker;

          setState({
            hub,
            broker,
            devices: hub.home.devices,
            isLoading: false,
            error: null,
            isConnected: broker.isConnected(),
          });

          // Update Cache
          await LocalStorage.setItem("miraie_devices_cache", JSON.stringify(hub.home.devices));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: message,
          }));

          await showToast({
            style: Toast.Style.Failure,
            title: "Connection Failed",
            message: message,
          });
        } finally {
          isInitializing = false;
          initializationPromise = null;
        }
      })();

      await initializationPromise;
    },
    [preferences.username, preferences.password, state.devices.length],
  );

  useEffect(() => {
    if (!state.broker) {
      return;
    }

    const handleConnectionChange = (isConnected: boolean) => {
      setState((prev) => ({
        ...prev,
        isConnected,
      }));
    };

    const handleError = (error: Error) => {
      const now = Date.now();
      if (now - lastErrorToastTimeRef.current > 60000) {
        showToast({
          style: Toast.Style.Failure,
          title: "MirAIe Connection Error",
          message: error.message,
        });
        lastErrorToastTimeRef.current = now;
      }

      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
    };

    state.broker.registerConnectionCallback(handleConnectionChange);
    state.broker.registerErrorCallback(handleError);

    return () => {
      state.broker?.removeConnectionCallback(handleConnectionChange);
      state.broker?.removeErrorCallback(handleError);
    };
  }, [state.broker]);

  const refreshDevices = useCallback(
    async (fetchEnergy = false, forceFullSync = false) => {
      if (!sharedHub) {
        await initialize(true);
        return;
      }

      try {
        if (forceFullSync) {
          await sharedHub.init(preferences.username, preferences.password, sharedBroker!);
        } else {
          await sharedHub.getAllDeviceStatus(fetchEnergy);
        }

        setState((prev) => ({
          ...prev,
          devices: [...sharedHub!.home.devices],
        }));

        // Update Cache after refresh
        await LocalStorage.setItem("miraie_devices_cache", JSON.stringify(sharedHub.home.devices));
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Refresh",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [initialize, preferences.username, preferences.password],
  );

  useEffect(() => {
    if (preferences.username && preferences.password) {
      initialize();
    }
  }, [initialize, preferences.username, preferences.password]);

  return {
    ...state,
    refreshDevices,
  };
}

// Export cleanup function for app-level cleanup
export function cleanupMirAIe() {
  if (sharedBroker) {
    sharedBroker.disconnect();
  }
  sharedHub = null;
  sharedBroker = null;
}
