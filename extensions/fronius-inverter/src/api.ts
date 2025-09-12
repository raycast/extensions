// src/api.ts
import { InverterInfoResponse, PowerFlowRealtimeDataResponse } from "./types";
const _fetch = typeof fetch !== "undefined" ? fetch : require("node-fetch");

/**
 * Fetches detailed information about all connected Fronius inverters
 *
 * This function makes a request to the Fronius Solar API v1 GetInverterInfo endpoint,
 * which returns comprehensive information about all inverters connected to the system.
 * The data includes custom names, device IDs, current state, error codes, and power values.
 *
 * This information is used for displaying inverter status and detecting error conditions.
 *
 * @param {string} baseUrl - The base URL of the Fronius inverter (e.g., http://192.168.0.75)
 * @returns {Promise<InverterInfoResponse>} A promise that resolves to the inverter information response
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchInverterInfo(baseUrl: string): Promise<InverterInfoResponse> {
  const url = `${baseUrl}/solar_api/v1/GetInverterInfo.cgi`;
  const response = await _fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch inverter info: ${response.statusText}`);
  }
  return response.json() as Promise<InverterInfoResponse>;
}

/**
 * Fetches real-time power flow data from the Fronius system
 *
 * This function makes a request to the Fronius Solar API v1 GetPowerFlowRealtimeData endpoint,
 * which returns current power flow information for the entire system. The data includes
 * current PV production, grid power (import/export), home consumption, battery status,
 * and energy totals.
 *
 * This information is used for displaying the system overview and calculating performance metrics.
 *
 * @param {string} baseUrl - The base URL of the Fronius inverter (e.g., http://192.168.0.75)
 * @returns {Promise<PowerFlowRealtimeDataResponse>} A promise that resolves to the power flow data response
 * @throws {Error} If the request fails or returns a non-OK status
 */
export async function fetchPowerFlowRealtimeData(baseUrl: string): Promise<PowerFlowRealtimeDataResponse> {
  const url = `${baseUrl}/solar_api/v1/GetPowerFlowRealtimeData.fcgi`;
  const response = await _fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch power flow realtime data: ${response.statusText}`);
  }
  return response.json() as Promise<PowerFlowRealtimeDataResponse>;
}
