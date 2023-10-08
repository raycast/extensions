import { ListDevicesResponse } from "./../interfaces/device";
import axiosClient from "./axios";

export const listDevices = async () => {
  const res = await axiosClient.get("/devices");

  const data: ListDevicesResponse = res.data;

  if (!data.success) {
    throw new Error(`Failed to fetch devices.`);
  }

  return data.body.devices;
};
