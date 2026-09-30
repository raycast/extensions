import { exec } from "child_process";
import { useEffect, useState } from "react";
import { getAdbDir } from "./utils";
import { showToast, Toast } from "@raycast/api";
import { DeviceOption } from "./types";

export default function useDevices() {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  useEffect(() => {
    exec(`${getAdbDir()}/adb devices`, (err, stdout) => {
      if (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch devices! Please config adb in extension preference",
          message: err.message,
        });
        return;
      }
      const devices = stdout
        .split("\n")
        .slice(1)
        .filter(Boolean)
        .map((device) => ({
          serial: device.split("\t")[0],
        }));
      setDevices(devices);
    });
  }, []);
  return devices;
}
