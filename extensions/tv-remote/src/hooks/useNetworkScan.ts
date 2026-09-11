import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { type DiscoveredTV, getLocalIP, getSubnet, scanForSonyTV } from "../utils/network-scanner";

interface NetworkState {
  scanProgress: number;
  isScanning: boolean;
  discoveredTV: DiscoveredTV | null;
  localIP: string;
  subnet: string;
}

export function useNetworkScan() {
  const [state, setState] = useState<NetworkState>({
    scanProgress: 0,
    isScanning: false,
    discoveredTV: null,
    localIP: "Detecting...",
    subnet: "",
  });

  useEffect(() => {
    const ip = getLocalIP();
    setState((prev) => ({
      ...prev,
      localIP: ip,
      subnet: getSubnet(ip),
    }));
  }, []);

  const scan = useCallback(async () => {
    if (!state.subnet || state.subnet === "Unknown") {
      await showFailureToast("No network detected", { title: "Network Error" });
      return;
    }

    setState((s) => ({
      ...s,
      isScanning: true,
      scanProgress: 0,
      discoveredTV: null,
    }));

    try {
      const result = await scanForSonyTV((progress) => {
        setState((s) => ({ ...s, scanProgress: progress }));
      });

      setState((s) => ({
        ...s,
        isScanning: false,
        scanProgress: 100,
        discoveredTV: result,
      }));

      return result;
    } catch (error) {
      await showFailureToast(error, { title: "Scan failed" });
      setState((s) => ({ ...s, isScanning: false }));
      return null;
    }
  }, [state.subnet]);

  return {
    ...state,
    scan,
  };
}
