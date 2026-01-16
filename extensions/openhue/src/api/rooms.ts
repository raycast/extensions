import { RoomApi } from "./generated/src/apis/RoomApi";
import { GroupedLightApi } from "./generated/src/apis/GroupedLightApi";
import { Configuration } from "./generated/src/runtime";
import { RoomGet, GroupedLightGet, GroupedLightPut, ResourceIdentifier } from "./generated/src/models";
import { getFetchAdapter } from "./fetch-adapter";
import { getCredentials } from "./client";

// Create configured API instances
let roomApiInstance: RoomApi | null = null;
let groupedLightApiInstance: GroupedLightApi | null = null;

async function getConfig(): Promise<Configuration> {
  const fetchAdapter = await getFetchAdapter();
  const credentials = getCredentials();

  if (!credentials) {
    throw new Error("Bridge not configured. Please run Setup Hue Bridge first.");
  }

  return new Configuration({
    basePath: `https://${credentials.bridgeIP}`,
    fetchApi: fetchAdapter,
    apiKey: credentials.applicationKey,
  });
}

async function getRoomApi(): Promise<RoomApi> {
  if (!roomApiInstance) {
    const config = await getConfig();
    roomApiInstance = new RoomApi(config);
  }
  return roomApiInstance;
}

async function getGroupedLightApi(): Promise<GroupedLightApi> {
  if (!groupedLightApiInstance) {
    const config = await getConfig();
    groupedLightApiInstance = new GroupedLightApi(config);
  }
  return groupedLightApiInstance;
}

export async function getRooms(): Promise<RoomGet[]> {
  const api = await getRoomApi();
  const response = await api.getRooms();
  return response.data || [];
}

export async function getRoom(roomId: string): Promise<RoomGet | null> {
  const api = await getRoomApi();
  const response = await api.getRoom(roomId);
  return response.data?.[0] ?? null;
}

export async function getGroupedLights(): Promise<GroupedLightGet[]> {
  const api = await getGroupedLightApi();
  const response = await api.getGroupedLights();
  return response.data || [];
}

export async function getGroupedLight(groupedLightId: string): Promise<GroupedLightGet | null> {
  const api = await getGroupedLightApi();
  const response = await api.getGroupedLight(groupedLightId);
  return response.data?.[0] ?? null;
}

export async function updateGroupedLight(groupedLightId: string, data: GroupedLightPut): Promise<ResourceIdentifier[]> {
  const api = await getGroupedLightApi();
  const response = await api.updateGroupedLight(groupedLightId, data);
  return response.data || [];
}

export async function toggleRoom(groupedLightId: string, on: boolean): Promise<ResourceIdentifier[]> {
  return updateGroupedLight(groupedLightId, { on: { on } });
}

export async function setRoomBrightness(groupedLightId: string, brightness: number): Promise<ResourceIdentifier[]> {
  const clampedBrightness = Math.max(1, Math.min(100, brightness));
  return updateGroupedLight(groupedLightId, { dimming: { brightness: clampedBrightness } });
}

// Helper to get the grouped_light service ID from a room
export function getGroupedLightIdFromRoom(room: RoomGet): string | null {
  const groupedLightService = room.services?.find((s) => s.rtype === "grouped_light");
  return groupedLightService?.rid ?? null;
}
