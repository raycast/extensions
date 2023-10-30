import { useCallback, useEffect, useState } from "react";
import { spawn } from "child_process";
import { NetworkSpeed } from "../types/type";
import { extractSpeedLoadingInfo, getNetSpeed } from "../utils/common-util";

export const checkNetworkSpeed = (refresh: number, testSequentially = false) => {
  const [networkSpeedInfo, setNetworkSpeedInfo] = useState<string>("");
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>();
  const [networkSpeedLoading, setNetworkSpeedLoading] = useState<string>("Takes about 20 seconds");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const args = testSequentially ? "-s" : "";
    const result = spawn("networkQuality", [args], { shell: true });

    const onData = (data: string) => {
      const dataString = String(data);
      if (dataString.includes("SUMMARY")) {
        // Done, get final speed results
        setNetworkSpeed(getNetSpeed(testSequentially, dataString));
        setNetworkSpeedInfo(dataString.slice(dataString.indexOf("=")));
        setLoading(false);
      } else {
        // Loading, results returned during speed measurement
        setNetworkSpeedLoading(extractSpeedLoadingInfo(dataString));
      }
    };

    result.stdout.on("data", onData);

    return () => {
      result.stdout.off("data", onData);
    };
  }, [refresh]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    fetchData().then((returnedCleanup) => {
      cleanup = returnedCleanup;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [fetchData]);

  return {
    networkSpeedInfo: networkSpeedInfo,
    networkSpeed: networkSpeed,
    networkSpeedLoading: networkSpeedLoading,
    loading: loading,
  };
};
