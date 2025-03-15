import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { Device } from "../types";
import { filterDevices } from "../utils";
import { fetchIOSDevices, fetchAndroidDevices } from "../utils/simulator-commands";
import { REFRESH_INTERVAL } from "../constants";

interface UseDeviceManagerProps {
  androidSdkFound: boolean;
  deviceTypesToDisplay: string;
  searchText: string;
  selectedCategory: string;
  xcodeFound: boolean;
}

export function useDeviceManager(props: UseDeviceManagerProps) {
  const { androidSdkFound, deviceTypesToDisplay, searchText, selectedCategory, xcodeFound } = props;

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      setIsLoading(true);

      let iosDevices: Device[] = [];
      let androidDevices: Device[] = [];

      if ((deviceTypesToDisplay === "all" || deviceTypesToDisplay === "ios") && xcodeFound) {
        iosDevices = await fetchIOSDevices();
      }

      if ((deviceTypesToDisplay === "all" || deviceTypesToDisplay === "android") && androidSdkFound) {
        androidDevices = await fetchAndroidDevices();
      }

      setDevices([...iosDevices, ...androidDevices]);
    } catch (error) {
      console.error("Error fetching devices:", error);
      showFailureToast(error, { title: "Failed to fetch devices" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const intervalId = setInterval(fetchDevices, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [deviceTypesToDisplay, androidSdkFound, xcodeFound]);

  const filteredDevices = filterDevices(devices, searchText, selectedCategory);

  return {
    devices: filteredDevices,
    isLoading,
    fetchDevices,
  };
}
