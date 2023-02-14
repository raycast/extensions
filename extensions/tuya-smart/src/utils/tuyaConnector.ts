import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import { getPreferenceValues } from "@raycast/api";
import {
  Preferences,
  DevicesReponse,
  DeviceCategory,
  Device,
  FunctionItem,
  CommandResponse,
  DeviceFunctionsResult,
  Status,
} from "./interfaces";

const getPreference = () => {
  const { accessId, accessSecret, region } = getPreferenceValues<Preferences>();

  return new TuyaContext({
    accessKey: accessId,
    secretKey: accessSecret,
    baseUrl: region,
  });
};

const context = getPreference();

export const getDevices = async (last_row_key?: string, allDevices: Device[] = []): Promise<Device[]> => {
  const devicesResult = await context.request<DevicesReponse>({
    path: "/v1.0/iot-01/associated-users/devices",
    method: "GET",
    query: {
      last_row_key,
    },
  });

  if (devicesResult && devicesResult.result && devicesResult.result.devices) {
    allDevices.push(...devicesResult.result.devices);

    if (devicesResult.result.has_more) {
      return getDevices(devicesResult.result.last_row_key, allDevices);
    }

    return allDevices;
  }

  return [];
};

export const getCategories = async () => {
  const categories = await context.request<DeviceCategory[]>({
    path: "/v1.0/iot-03/device-categories",
    method: "GET",
  });

  return categories;
};

export const sendCommand = async (props: { device_id: string; commands: Status[] }): Promise<boolean> => {
  const result = await context.request<CommandResponse>({
    path: `/v1.0/iot-03/devices/${props.device_id}/commands`,
    method: "POST",
    body: {
      commands: props.commands,
    },
  });

  return result.success;
};

export const getDeviceFunctionsInfo = async (device_id: string) => {
  const result = await context.request<DeviceFunctionsResult>({
    path: `/v1.0/devices/${device_id}/functions`,
    method: "GET",
  });

  return result.result?.functions ?? [];
};

export default context;
