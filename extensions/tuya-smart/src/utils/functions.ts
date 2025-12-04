import { Device, DeviceCategories, DeviceCategory } from "./interfaces";
import { getDeviceFunctionsInfo } from "./tuyaConnector";
import { showToast, Toast } from "@raycast/api";

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

export function timeConversion(duration: number) {
  const second = 1000;
  const minute = second * 60;
  const hour = minute * 60;

  const hours = Math.floor((duration / hour) % 24);
  const minutes = Math.floor((duration / minute) % 60);
  const seconds = Math.floor((duration / second) % 60);

  return `${hours < 10 ? `0${hours}` : hours}h:${minutes < 10 ? `0${minutes}` : minutes}m:${
    seconds < 10 ? `0${seconds}` : seconds
  }s`;
}

export function ShowToastError(error: Error) {
  let ErrorMessage = error.message;

  if (error.message.includes("1114") || error.message.includes("1004")) {
    ErrorMessage = "Please verify your access & secret tokens";
  } else if (error.message.includes("28841105") || error.message.includes("28841002")) {
    ErrorMessage = "Your Project doesn't have access to API, please read trhoubleshooting";
  }

  showToast(Toast.Style.Failure, ErrorMessage);
}
