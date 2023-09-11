import { useCallback, useEffect, useState } from "react";
import { Alert, confirmAlert, Icon } from "@raycast/api";
import { spawn } from "child_process";
import { NetworkSpeed } from "../types/type";
import { getNetSpeed } from "../utils/common-util";

export const checkNetworkSpeed = (refresh: number, testSequentially = false) => {
  const [networkSpeedInfo, setNetworkSpeedInfo] = useState<string>("");
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>();
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const args = testSequentially ? "-s" : "";
    const result = spawn("networkQuality", [args], { shell: true });

    result.stdout.on("data", (data: string) => {
      setNetworkSpeed(getNetSpeed(testSequentially, data));
      const info = String(data);
      setNetworkSpeedInfo(info.slice(info.indexOf("=")));
      setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { networkSpeedInfo: networkSpeedInfo, networkSpeed: networkSpeed, loading: loading };
};
