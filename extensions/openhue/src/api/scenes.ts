import { SceneApi } from "./generated/src/apis/SceneApi";
import { Configuration } from "./generated/src/runtime";
import { SceneGet, ScenePut, ResourceIdentifier } from "./generated/src/models";
import { getFetchAdapter } from "./fetch-adapter";
import { getCredentials } from "./client";

// Create configured API instance
let sceneApiInstance: SceneApi | null = null;

async function getSceneApi(): Promise<SceneApi> {
  if (!sceneApiInstance) {
    const fetchAdapter = await getFetchAdapter();
    const credentials = getCredentials();

    if (!credentials) {
      throw new Error("Bridge not configured. Please run Setup Hue Bridge first.");
    }

    const config = new Configuration({
      basePath: `https://${credentials.bridgeIP}`,
      fetchApi: fetchAdapter,
      apiKey: credentials.applicationKey,
    });

    sceneApiInstance = new SceneApi(config);
  }

  return sceneApiInstance;
}

export async function getScenes(): Promise<SceneGet[]> {
  const api = await getSceneApi();
  const response = await api.getScenes();
  return response.data || [];
}

export async function getScene(sceneId: string): Promise<SceneGet | null> {
  const api = await getSceneApi();
  const response = await api.getScene(sceneId);
  return response.data?.[0] ?? null;
}

export async function updateScene(sceneId: string, data: ScenePut): Promise<ResourceIdentifier[]> {
  const api = await getSceneApi();
  const response = await api.updateScene(sceneId, data);
  return response.data || [];
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
export function groupScenesByRoom(scenes: SceneGet[]): Map<string, SceneGet[]> {
  const grouped = new Map<string, SceneGet[]>();

  for (const scene of scenes) {
    const roomId = scene.group?.rid;
    if (!roomId) continue;

    const existing = grouped.get(roomId) ?? [];
    existing.push(scene);
    grouped.set(roomId, existing);
  }

  return grouped;
}
