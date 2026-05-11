// src/api.ts
import { InverterInfoResponse, PowerFlowRealtimeDataResponse } from "./types";
const _fetch = typeof fetch !== "undefined" ? fetch : require("node-fetch");

export async function fetchInverterInfo(baseUrl: string): Promise<InverterInfoResponse> {
  const url = `${baseUrl}/solar_api/v1/GetInverterInfo.cgi`;
  const response = await _fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch inverter info: ${response.statusText}`);
  }
  return response.json() as Promise<InverterInfoResponse>;
}

export async function fetchPowerFlowRealtimeData(baseUrl: string): Promise<PowerFlowRealtimeDataResponse> {
  const url = `${baseUrl}/solar_api/v1/GetPowerFlowRealtimeData.fcgi`;
  const response = await _fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch power flow realtime data: ${response.statusText}`);
  }
  return response.json() as Promise<PowerFlowRealtimeDataResponse>;
}
