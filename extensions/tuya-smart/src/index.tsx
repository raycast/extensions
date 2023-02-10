import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { getDevices, getCategories } from "./utils/tuyaConnector";
import { DeviceCategory, Device } from "./utils/interfaces";
import { DeviceList } from "./components/list";
import { getCategory } from "./utils/functions";
import { DeviceOnlineFilterDropdown, DeviceOnlineFilterType, placeholder } from "./components/filter";

export default function Command() {
  // States
  const [filter, setFilter] = useState(DeviceOnlineFilterType.all);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useCachedState<Device[]>("devices", []);
  const [categories, setCategories] = useCachedState<DeviceCategory[]>("categories", []);

  useEffect(() => {
    const getDeviceCategories = async () => {
      const categories = await getCategories();
      setCategories((prev) => {
        LocalStorage.setItem("categories", JSON.stringify(categories.result));
        return categories.result;
      });
    };

    getDeviceCategories().catch(console.error);
  }, []);

  useEffect(() => {
    const getAllDevices = async () => {
      const devices = await getDevices();

      const formatedDevices = devices.map((device) => {
        return {
          ...device,
          category: getCategory(categories, device.category),
        };
      });
      setDevices(formatedDevices);
      setIsLoading(false);
    };

    if (categories) {
      getAllDevices().catch(console.error);
    }
  }, [categories]);

  const finalDevices =
    filter === DeviceOnlineFilterType.all
      ? devices
      : filter === DeviceOnlineFilterType.Online
      ? devices.filter((device) => device.online)
      : devices.filter((device) => !device.online);

  return (
    <DeviceList
      devices={finalDevices}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<DeviceOnlineFilterDropdown onSelect={setFilter} />}
      isLoading={isLoading}
      onAction={() => () => {}}
    />
  );
}
