import axios, { AxiosInstance } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { PterodactylResponse, Server, ServerResources } from "./types";

const preferences = getPreferenceValues();

if (!preferences.pterodactylUrl) {
  throw new Error("Pterodactyl URL is not set. Please check your extension preferences.");
}

// Ensure URL doesn't end with slash
const baseURL = preferences.pterodactylUrl.endsWith("/")
  ? preferences.pterodactylUrl.slice(0, -1)
  : preferences.pterodactylUrl;

const client: AxiosInstance = axios.create({
  baseURL: `${baseURL}/api/client`,
  headers: {
    Authorization: `Bearer ${preferences.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export async function getServers(): Promise<Server[]> {
  const response = await client.get<PterodactylResponse<Server>>("/");
  return response.data.data;
}

export async function getServerResources(identifier: string): Promise<ServerResources["attributes"]> {
  try {
    const response = await client.get<ServerResources>(`/servers/${identifier}/resources`);
    return response.data.attributes;
  } catch (error) {
    console.error(`Failed to get resources for ${identifier}`, error);
    // Return offline state if request fails (e.g. server installing)
    return {
      current_state: "offline",
      is_suspended: false,
      resources: { memory_bytes: 0, cpu_absolute: 0, disk_bytes: 0, network_rx_bytes: 0, network_tx_bytes: 0 },
    };
  }
}

export async function setPowerState(identifier: string, signal: "start" | "stop" | "restart" | "kill"): Promise<void> {
  await client.post(`/servers/${identifier}/power`, { signal });
}

export async function sendCommand(identifier: string, command: string): Promise<void> {
  await client.post(`/servers/${identifier}/command`, { command });
}

export async function getWebsocketCredentials(identifier: string): Promise<{ token: string; socket: string }> {
  const response = await client.get<{ data: { token: string; socket: string } }>(`/servers/${identifier}/websocket`);
  return response.data.data;
}
