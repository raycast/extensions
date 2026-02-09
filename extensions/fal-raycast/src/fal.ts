import { getPreferenceValues } from "@raycast/api";
import { fal } from "@fal-ai/client";
import { lookup as lookupMime } from "mime-types";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ModelEndpoint, ModelSearchResponse } from "./types";

type Preferences = {
  falApiKey: string;
  defaultEndpointId?: string;
  defaultNoImageEndpointId?: string;
  defaultImageEndpointId?: string;
};

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

function authHeaders() {
  const { falApiKey } = getPreferences();
  if (!falApiKey) {
    return {} as Record<string, string>;
  }
  return { Authorization: `Key ${falApiKey}` };
}

function toUrl(
  pathname: string,
  params?: Record<string, string | number | undefined>,
) {
  const url = new URL(pathname, "https://api.fal.ai/v1/");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

export async function searchModels(query: string) {
  const url = toUrl("models", {
    q: query || undefined,
    limit: 100,
    status: "active",
  });
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`fal model search failed (${response.status})`);
  }
  return (await response.json()) as ModelSearchResponse;
}

export async function getModel(endpointId: string) {
  const url = toUrl("models", {
    endpoint_id: endpointId,
    expand: "openapi-3.0",
  });
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`failed to load model schema (${response.status})`);
  }
  const data = (await response.json()) as ModelSearchResponse;
  const model = data.models.find((item) => item.endpoint_id === endpointId);
  if (!model) {
    throw new Error(`model not found: ${endpointId}`);
  }
  return model;
}

export async function getModelsByEndpointIds(endpointIds: string[]) {
  if (endpointIds.length === 0) {
    return [] as ModelEndpoint[];
  }

  const url = toUrl("models", { limit: Math.min(endpointIds.length, 50) });
  for (const endpointId of endpointIds) {
    url.searchParams.append("endpoint_id", endpointId);
  }

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`failed to load favorite models (${response.status})`);
  }

  const data = (await response.json()) as ModelSearchResponse;
  return data.models;
}

function getMimeFromPath(filePath: string) {
  const extMime = lookupMime(filePath);
  if (extMime) {
    return extMime;
  }

  const ext = path.extname(filePath).toLowerCase();
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

export async function uploadImage(filePath: string) {
  const { falApiKey } = getPreferences();
  fal.config({ credentials: falApiKey });
  const bytes = await readFile(filePath);
  const mime = getMimeFromPath(filePath);
  const file = new File([bytes], path.basename(filePath), { type: mime });
  return fal.storage.upload(file);
}

export async function runModel(
  endpointId: string,
  input: Record<string, unknown>,
) {
  const { falApiKey } = getPreferences();
  fal.config({ credentials: falApiKey });
  const result = await fal.subscribe(endpointId, { input });
  return result.data;
}

export function modelLabel(model: ModelEndpoint) {
  return model.metadata?.display_name || model.endpoint_id;
}
