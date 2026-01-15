import { hueGet, huePut } from "./client";
import { Light, LightPut, ResourceIdentifier } from "./types";

const LIGHTS_ENDPOINT = "/clip/v2/resource/light";

export async function getLights(): Promise<Light[]> {
  const response = await hueGet<Light>(LIGHTS_ENDPOINT);
  return response.data;
}

export async function getLight(lightId: string): Promise<Light | null> {
  const response = await hueGet<Light>(`${LIGHTS_ENDPOINT}/${lightId}`);
  return response.data[0] ?? null;
}

export async function updateLight(lightId: string, data: LightPut): Promise<ResourceIdentifier[]> {
  const response = await huePut<ResourceIdentifier>(`${LIGHTS_ENDPOINT}/${lightId}`, data);
  return response.data;
}

export async function toggleLight(lightId: string, on: boolean): Promise<ResourceIdentifier[]> {
  return updateLight(lightId, { on: { on } });
}

export async function setLightBrightness(lightId: string, brightness: number): Promise<ResourceIdentifier[]> {
  // Brightness must be between 1 and 100 (0 would turn off)
  const clampedBrightness = Math.max(1, Math.min(100, brightness));
  return updateLight(lightId, { dimming: { brightness: clampedBrightness } });
}

export async function setLightColor(lightId: string, x: number, y: number): Promise<ResourceIdentifier[]> {
  return updateLight(lightId, { color: { xy: { x, y } } });
}

export async function setLightColorTemperature(lightId: string, mirek: number): Promise<ResourceIdentifier[]> {
  // Mirek must be between 153 (cold) and 500 (warm)
  const clampedMirek = Math.max(153, Math.min(500, mirek));
  return updateLight(lightId, { color_temperature: { mirek: clampedMirek } });
}
