import { LightApi } from "./generated/src/apis/LightApi";
import { Configuration, ResponseError } from "./generated/src/runtime";
import { LightGet, LightPut, ResourceIdentifier } from "./generated/src/models";
import { getFetchAdapter } from "./fetch-adapter";
import { getCredentials } from "./client";

// Create configured API instance
let lightApiInstance: LightApi | null = null;

async function getLightApi(): Promise<LightApi> {
  if (!lightApiInstance) {
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

    lightApiInstance = new LightApi(config);
  }

  return lightApiInstance;
}

async function handleApiError<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof ResponseError) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await error.response.json();
        const description =
          (Array.isArray(json?.errors) && typeof json.errors[0]?.description === "string"
            ? json.errors[0].description
            : undefined) || `HTTP ${error.response.status} ${error.response.statusText}`;

        console.error("[Hue API] request failed", {
          status: error.response.status,
          statusText: error.response.statusText,
          description,
        });

        throw new Error(description);
      } catch {
        throw new Error(`HTTP ${error.response.status} ${error.response.statusText}`);
      }
    }

    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getLights(): Promise<LightGet[]> {
  const api = await getLightApi();
  const response = await handleApiError(() => api.getLights());
  return response.data || [];
}

export async function getLight(lightId: string): Promise<LightGet | null> {
  const api = await getLightApi();
  const response = await handleApiError(() => api.getLight(lightId));
  return response.data?.[0] ?? null;
}

export async function updateLight(lightId: string, data: LightPut): Promise<ResourceIdentifier[]> {
  const api = await getLightApi();
  const response = await handleApiError(() => api.updateLight(lightId, data));
  return response.data || [];
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
