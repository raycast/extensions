import { hueGet, huePut } from "./client";
import { Room, GroupedLight, GroupedLightPut, ResourceIdentifier } from "./types";

const ROOMS_ENDPOINT = "/clip/v2/resource/room";
const GROUPED_LIGHT_ENDPOINT = "/clip/v2/resource/grouped_light";

export async function getRooms(): Promise<Room[]> {
  const response = await hueGet<Room>(ROOMS_ENDPOINT);
  return response.data;
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const response = await hueGet<Room>(`${ROOMS_ENDPOINT}/${roomId}`);
  return response.data[0] ?? null;
}

export async function getGroupedLights(): Promise<GroupedLight[]> {
  const response = await hueGet<GroupedLight>(GROUPED_LIGHT_ENDPOINT);
  return response.data;
}

export async function getGroupedLight(groupedLightId: string): Promise<GroupedLight | null> {
  const response = await hueGet<GroupedLight>(`${GROUPED_LIGHT_ENDPOINT}/${groupedLightId}`);
  return response.data[0] ?? null;
}

export async function updateGroupedLight(groupedLightId: string, data: GroupedLightPut): Promise<ResourceIdentifier[]> {
  const response = await huePut<ResourceIdentifier>(`${GROUPED_LIGHT_ENDPOINT}/${groupedLightId}`, data);
  return response.data;
}

export async function toggleRoom(groupedLightId: string, on: boolean): Promise<ResourceIdentifier[]> {
  return updateGroupedLight(groupedLightId, { on: { on } });
}

export async function setRoomBrightness(groupedLightId: string, brightness: number): Promise<ResourceIdentifier[]> {
  const clampedBrightness = Math.max(1, Math.min(100, brightness));
  return updateGroupedLight(groupedLightId, { dimming: { brightness: clampedBrightness } });
}

// Helper to get the grouped_light service ID from a room
export function getGroupedLightIdFromRoom(room: Room): string | null {
  const groupedLightService = room.services.find((s) => s.rtype === "grouped_light");
  return groupedLightService?.rid ?? null;
}
