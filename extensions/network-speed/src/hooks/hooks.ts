import { useCallback, useEffect, useState } from "react";
import { spawn } from "child_process";
import { NetworkSpeed } from "../types/type";
import { extractSpeedLoadingInfo, getNetSpeed } from "../utils/common-util";

export const checkNetworkSpeed = (testSequentially = false) => {
  const [timeCost, setTimeCost] = useState<string>("");
  const [networkSpeedInfo, setNetworkSpeedInfo] = useState<string>("");
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>();
  const [networkSpeedLoading, setNetworkSpeedLoading] = useState<string>("Takes about 20 seconds");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const args = testSequentially ? "-s" : "";
    const startTimestamp = Date.now();
    const result = spawn("networkQuality", [args], { shell: true });

    const onData = (data: string) => {
      const dataString = String(data);
      const testTime = (Date.now() - startTimestamp) / 1000;
      setTimeCost(testTime.toFixed(0));
      console.log(startTimestamp);
      console.log(testTime);
      console.log(testTime.toFixed(0));
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
  }, []);

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
    testTime: timeCost,
    loading: loading,
  };
};
