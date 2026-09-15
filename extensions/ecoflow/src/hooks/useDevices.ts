import { getPreferenceValues } from "@raycast/api";
import { useCallback } from "react";
import { createEcoFlowService } from "../devices/runtime";
import type { ExtensionPreferences } from "../types/preferences";
import { useAsyncValue } from "./useAsyncValue";

export function useDevices() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const load = useCallback(async () => {
    const devices = await createEcoFlowService().listDeviceSnapshots();
    return preferences.showOfflineDevices ? devices : devices.filter((device) => device.online);
  }, [preferences.showOfflineDevices]);

  return useAsyncValue(load);
}
