import axiosClient from "./axios";
import { Body, GetIPResponse } from "./../interfaces/ipRes";
import axios, { AxiosResponse } from "axios";
export const learnIP = async (deviceId: string) => {
  const ips: string[] = [];

  const ipv4 = await getIP(4);
  if (ipv4) {
    ips.push(ipv4.ip);
  }

  const ipv6 = await getIP(6);
  if (ipv6) {
    ips.push(ipv6.ip);
  }

  if (ips.length === 0) {
    return;
  }

  const res = await axiosClient.post(`/access`, {
    device_id: deviceId,
    ips,
  });

  if (!res.data.success) {
    throw new Error(`Failed to learn IP.`);
  }
};

export const getIP = async (version: 4 | 6 = 4): Promise<Body | null> => {
  let res: AxiosResponse;
  try {
    res = await axios.get(`https://api-v${version}.controld.com/ip`);
  } catch (e) {
    return null;
  }

  const data: GetIPResponse = res.data;

  if (!data.success) {
    return null;
  }

  return data.body;
};
