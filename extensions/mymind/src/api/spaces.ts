import { api } from "./client";
import { Space, SpaceSchema, unwrapList } from "./schemas";

export async function listSpaces(limit = 1000): Promise<Space[]> {
  const data = await api.get<unknown>("/spaces", { query: { limit } });
  return unwrapList(SpaceSchema, data, ["spaces", "items"]);
}

export async function addObjectToSpace(spaceId: string, objectId: string): Promise<void> {
  await api.put(`/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}`);
}

export async function removeObjectFromSpace(spaceId: string, objectId: string): Promise<void> {
  await api.delete(`/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}`);
}
