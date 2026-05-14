import { LocalStorage } from "@raycast/api";
import crypto from "crypto";

const SCENES_STORAGE_KEY = "wled-scenes";

export interface DeviceState {
  deviceIp: string; // Unique identifier for the device
  deviceName: string; // Display name of the device
  power: boolean;
  brightness: number;
  color?: [number, number, number]; // RGB
  effectId?: number;
  effectSpeed?: number;
  effectIntensity?: number;
  paletteId?: number;
}

export interface WLEDScene {
  id: string;
  name: string;
  description?: string;

  // Array of device states included in this scene
  deviceStates: DeviceState[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Load all saved scenes from LocalStorage
 */
export async function loadScenes(): Promise<WLEDScene[]> {
  try {
    const stored = await LocalStorage.getItem<string>(SCENES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as WLEDScene[];
  } catch (error) {
    console.error("Error loading scenes:", error);
    return [];
  }
}

/**
 * Save scenes array to LocalStorage
 */
export async function saveScenes(scenes: WLEDScene[]): Promise<void> {
  await LocalStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes));
}

/**
 * Create a new scene
 */
export async function createScene(sceneData: Omit<WLEDScene, "id" | "createdAt" | "updatedAt">): Promise<WLEDScene> {
  const scenes = await loadScenes();

  const now = new Date().toISOString();
  const newScene: WLEDScene = {
    ...sceneData,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  scenes.push(newScene);
  await saveScenes(scenes);

  return newScene;
}

/**
 * Update an existing scene
 */
export async function updateScene(id: string, updates: Partial<Omit<WLEDScene, "id" | "createdAt">>): Promise<void> {
  const scenes = await loadScenes();
  const sceneIndex = scenes.findIndex((s) => s.id === id);

  if (sceneIndex === -1) {
    throw new Error(`Scene with id ${id} not found`);
  }

  scenes[sceneIndex] = {
    ...scenes[sceneIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveScenes(scenes);
}

/**
 * Delete a scene by id
 */
export async function deleteScene(id: string): Promise<void> {
  const scenes = await loadScenes();
  const filteredScenes = scenes.filter((s) => s.id !== id);
  await saveScenes(filteredScenes);
}

/**
 * Get a single scene by id
 */
export async function getScene(id: string): Promise<WLEDScene | null> {
  const scenes = await loadScenes();
  return scenes.find((s) => s.id === id) || null;
}
