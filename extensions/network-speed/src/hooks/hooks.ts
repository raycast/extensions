import { useCallback, useEffect, useState } from "react";
import { Alert, confirmAlert, Icon } from "@raycast/api";
import { spawn } from "child_process";
import { NetworkSpeed } from "../types/type";

export const checkNetworkSpeed = (refresh: number, testSequentially = false) => {
  const [networkSpeedInfo, setNetworkSpeedInfo] = useState<string>("");
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>();
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const args = testSequentially ? "-s" : "";
    const result = spawn("networkQuality", [args], { shell: true });

    result.stdout.on("data", (data: string) => {
      const finalData = data + "E";
      const uploadCapacity = finalData.match(/Upload capacity: ([\s\S]*?)\nDownload capacity/);
      const downloadCapacity = finalData.match(/Download capacity: ([\s\S]*?)\nUpload flows/);
      const responsiveness = finalData.match(/Responsiveness: ([\s\S]*?)E/);
      const uploadResponsiveness = finalData.match(/Upload Responsiveness: ([\s\S]*?)\nDownload/);
      const downloadResponsiveness = finalData.match(/Download Responsiveness: ([\s\S]*?)E/);
      const network: NetworkSpeed = {
        uploadCapacity: uploadCapacity !== null ? uploadCapacity[1].trim() : "0 Mbps",
        downloadCapacity: downloadCapacity !== null ? downloadCapacity[1].trim() : "0 Mbps",
        uploadResponsiveness: uploadResponsiveness !== null ? uploadResponsiveness[1].trim() : "0 RPM",
        downloadResponsiveness: downloadResponsiveness !== null ? downloadResponsiveness[1].trim() : "0 RPM",
        responsiveness: responsiveness !== null ? responsiveness[1].trim() : "0 RPM",
      };

      setNetworkSpeed(network);
      setNetworkSpeedInfo(data);
      setLoading(false);
    });
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { networkSpeedInfo: networkSpeedInfo, networkSpeed: networkSpeed, loading: loading };
};
