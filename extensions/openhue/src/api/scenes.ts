import { hueGet, huePut } from "./client";
import { Scene, ScenePut, ResourceIdentifier } from "./types";

const SCENES_ENDPOINT = "/clip/v2/resource/scene";

export async function getScenes(): Promise<Scene[]> {
  const response = await hueGet<Scene>(SCENES_ENDPOINT);
  return response.data;
}

export async function getScene(sceneId: string): Promise<Scene | null> {
  const response = await hueGet<Scene>(`${SCENES_ENDPOINT}/${sceneId}`);
  return response.data[0] ?? null;
}

export async function updateScene(sceneId: string, data: ScenePut): Promise<ResourceIdentifier[]> {
  const response = await huePut<ResourceIdentifier>(`${SCENES_ENDPOINT}/${sceneId}`, data);
  return response.data;
}

export async function activateScene(
  sceneId: string,
  action: "active" | "dynamic_palette" | "static" = "active",
  duration?: number,
): Promise<ResourceIdentifier[]> {
  const recall: ScenePut["recall"] = { action };
  if (duration !== undefined) {
    recall.duration = duration;
  }
  return updateScene(sceneId, { recall });
}

// Helper to group scenes by room
export function groupScenesByRoom(scenes: Scene[]): Map<string, Scene[]> {
  const grouped = new Map<string, Scene[]>();

  for (const scene of scenes) {
    const roomId = scene.group.rid;
    const existing = grouped.get(roomId) ?? [];
    existing.push(scene);
    grouped.set(roomId, existing);
  }

  return grouped;
}
