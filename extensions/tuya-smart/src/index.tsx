import { useEffect, useRef, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { getCategories, getDevicesFunctions } from "./utils/tuyaConnector";
import { loadDevicesWithFallback } from "./utils/deviceSource";
import { DeviceCategory, Device } from "./utils/interfaces";
import { DeviceList } from "./components/list";
import { getCategory, getDeviceFunctions, isPinned, ShowToastError } from "./utils/functions";
import { cleanName } from "./utils/deviceSemantics";
import { DeviceOnlineFilterDropdown, placeholder } from "./components/filter";
import { DeviceOnlineFilterType, filterDevices } from "./utils/filters";

export default function Command() {
  const [filter, setFilter] = useState(DeviceOnlineFilterType.all);
  const [isLoading, setIsLoading] = useState(true);
  // Off by default: the side panel squeezes the list column and truncates the
  // state, battery and offline accessories, which are the useful part at a glance.
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>("showDetail", false);
  const [devices, setDevices] = useCachedState<Device[]>("devices", []);
  const [categories, setCategories] = useCachedState<DeviceCategory[]>("categories", []);

  // Keeps the effect below from reading a stale device list through its closure.
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  // Categories only translate a code into a display name, so a failure here must not
  // stop the device list from loading.
  useEffect(() => {
    getCategories()
      .then((result) => setCategories(result ?? []))
      .catch(() => setCategories((previous) => previous ?? []));
  }, []);

  useEffect(() => {
    const load = async () => {
      const { devices: fetched, source } = await loadDevicesWithFallback();
      const previousDevices = devicesRef.current ?? [];

      // One request for the whole account instead of one per device.
      const functionsByDevice = await getDevicesFunctions(fetched.map((device) => device.id));

      const populated = fetched.map((device) => ({
        ...device,
        name: cleanName(device.name),
        status: getDeviceFunctions(
          device,
          previousDevices.find((deviceInfo) => deviceInfo.id === device.id),
          functionsByDevice.get(device.id) ?? [],
        ),
      }));

      setDevices((prev) => populated.map((device) => ({ ...device, pinned: isPinned(device, prev ?? []) })));
      setIsLoading(false);

      if (source === "cache") {
        showToast(
          Toast.Style.Failure,
          "Showing Cached Devices",
          "The Tuya cloud is unavailable, so commands will be sent over the local network where possible.",
        );
      }
    };

    load().catch((error) => {
      setIsLoading(false);
      ShowToastError(error);
    });
  }, []);

  const visible = filterDevices(devices ?? [], filter).map((device) => ({
    ...device,
    category: getCategory(categories ?? [], device.category),
  }));

  return (
    <DeviceList
      devices={visible}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<DeviceOnlineFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      onToggleDetail={() => setIsShowingDetail((previous) => !previous)}
      filter={filter}
      onAction={(device) => {
        setDevices((prev) => (prev ?? []).map((oldDevice) => (device.id === oldDevice.id ? device : { ...oldDevice })));
      }}
    />
  );
}
