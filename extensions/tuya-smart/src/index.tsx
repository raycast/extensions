import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { getDevices, getCategories } from "./utils/tuyaConnector";
import { DeviceCategory, Device } from "./utils/interfaces";
import { DeviceList } from "./components/list";
import { getCategory, getDeviceFunctions, isPinned, ShowToastError } from "./utils/functions";
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

      setCategories(() => {
        return categories.result;
      });
    };

    getDeviceCategories().catch((error) => {
      setIsLoading(false);
      setCategories(() => {
        return [];
      });
      setDevices(() => {
        return [];
      });
      ShowToastError(error);
    });
  }, []);

  useEffect(() => {
    const getAllDevices = async () => {
      const newDevicesinfo = await getDevices();

      const populateDevicesPromises = newDevicesinfo.map(async (device) => {
        const oldDeviceInfo = devices.find((deviceInfo) => deviceInfo.id === device.id);
        const functions = await getDeviceFunctions(device, oldDeviceInfo);

        return {
          ...device,
          status: functions,
        };
      });

      const devicesPopulated = await Promise.all(populateDevicesPromises);

      setDevices((prev) => {
        const formatedDevices = devicesPopulated.map((device) => {
          return {
            ...device,
            pinned: isPinned(device, prev),
            category: getCategory(categories, device.category),
          };
        });

        return formatedDevices;
      });
      setIsLoading(false);
    };

    if (categories && categories.length > 0) {
      getAllDevices().catch((error) => {
        ShowToastError(error);
      });
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
      onAction={(device) => {
        setDevices((prev) => {
          const formatedDevices = prev.map((oldDevice) => {
            if (device.id === oldDevice.id) {
              return device;
            }

            return {
              ...oldDevice,
            };
          });

          return formatedDevices;
        });
      }}
    />
  );
}
