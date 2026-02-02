import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useState } from "react";
import { PICTURE_MODES, TARGETS } from "../constants";
import type { DiscoveredTV } from "../utils/network-scanner";
import { getPictureQualitySettings, setPictureQualitySettings } from "../utils/sony-api";
import { useNetworkScan } from "./useNetworkScan";

export interface ExtendedDiscoveredTV extends DiscoveredTV {
  currentMode?: string;
}

export function useSonyTV() {
  const {
    scan: scanNetwork,
    isScanning: isNetworkScanning,
    scanProgress,
    discoveredTV: networkTV,
    localIP,
    subnet,
  } = useNetworkScan();

  const [isApplying, setIsApplying] = useState(false);
  const [finalTV, setFinalTV] = useState<ExtendedDiscoveredTV | null>(null);

  const scan = useCallback(async () => {
    // 1. Scan Network
    const result = await scanNetwork();

    if (!result) {
      await showFailureToast("Make sure you're on the TV's WiFi", {
        title: "No Sony TV found",
      });
      return;
    }

    // 2. Auto-Apply Settings
    setIsApplying(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Found ${result.info.model}`,
      message: "Checking settings...",
    });

    try {
      // Get initial mode
      const initialMode = await getPictureQualitySettings(result.ip, TARGETS.PICTURE_MODE);
      let finalMode = initialMode;

      const modeKey = initialMode?.includes("dv") ? "DOLBY_VISION" : "STANDARD";
      const targetSettings = PICTURE_MODES[modeKey];

      toast.message = `Auto-applying ${targetSettings.label}...`;

      const settings = [
        {
          value: targetSettings.apiValue,
          target: TARGETS.PICTURE_MODE,
        },
        {
          value: targetSettings.sharpness,
          target: TARGETS.SHARPNESS,
        },
      ];

      const success = await setPictureQualitySettings(result.ip, settings);

      if (success) {
        finalMode = await getPictureQualitySettings(result.ip, TARGETS.PICTURE_MODE);
        toast.style = Toast.Style.Success;
        toast.title = `Found ${result.info.model}`;
        toast.message = `${targetSettings.label} Applied`;
      } else {
        toast.style = Toast.Style.Failure; // Still found TV, just couldn't apply
        toast.message = "Could not apply settings";
      }

      setFinalTV({ ...result, currentMode: finalMode || undefined });
    } catch (error) {
      await showFailureToast(error, { title: "Auto-apply failed" });
    } finally {
      setIsApplying(false);
    }
  }, [scanNetwork]);

  return {
    scan,
    isScanning: isNetworkScanning || isApplying,
    scanProgress,
    discoveredTV: finalTV || (networkTV ? { ...networkTV } : null),
    localIP,
    subnet,
  };
}
