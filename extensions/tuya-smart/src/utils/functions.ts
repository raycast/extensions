import { Device, DeviceCategories, DeviceCategory, Status } from "./interfaces";
import { getDeviceFunctionsInfo } from "./tuyaConnector";

export const getCategory = (categories: DeviceCategory[], categoryCode: DeviceCategories): DeviceCategories => {
  const categoryInfo = categories.find((category) => category.code === categoryCode);
  if (categoryInfo) {
    return categoryInfo.name;
  }
  return categoryCode;
};

export const isPinned = (device: Device, oldDevices: Device[]) => {
  const oldState = oldDevices.find((oldDevice) => oldDevice.id === device.id);

  if (oldState) {
    return oldState.pinned ?? false;
  }

  return false;
};

export const getDeviceFunctions = async (device: Device, oldDeviceInfo?: Device) => {
  const functions = await getDeviceFunctionsInfo(device.id);

  const deviceFunctions = device.status.map((status) => {
    const oldStatusInfo = oldDeviceInfo?.status.find((oldSatusInfo) => oldSatusInfo.code === status.code);
    const functionInfo = functions.find((functionInfo) => functionInfo.code === status.code);

    if (functionInfo) {
      return {
        ...functionInfo,
        name: oldStatusInfo?.name ?? functionInfo.name,
        value: status.value,
      };
    }

    return status;
  });

  return deviceFunctions;
};
