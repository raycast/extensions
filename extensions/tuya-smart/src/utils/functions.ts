import { Device, DeviceCategories, DeviceCategory } from "./interfaces";

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
