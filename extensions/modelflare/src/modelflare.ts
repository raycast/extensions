import { getPreferenceValues } from "@raycast/api";

import { ModelDirectory, ModelflareClient, describeError, isModelflareError, type ModelKind } from "./core/index.js";

// Raycast store extensions have no package version; bump this with every
// store update so usage logs can tell releases apart.
const VERSION = "0.1.0";

interface Preferences {
  apiKey: string;
  baseUrl?: string;
}

export const UTM_SOURCE = "raycast";

let client: ModelflareClient | undefined;
let directory: ModelDirectory | undefined;

export function modelflare(): { client: ModelflareClient; directory: ModelDirectory } {
  if (!client || !directory) {
    const preferences = getPreferenceValues<Preferences>();
    client = new ModelflareClient({
      apiKey: preferences.apiKey,
      baseUrl: preferences.baseUrl || "global",
      plugin: "modelflare-raycast",
      version: VERSION,
    });
    directory = new ModelDirectory({ client });
  }
  return { client, directory };
}

export async function modelIds(kind: ModelKind): Promise<string[]> {
  const snapshot = await modelflare().directory.load();
  return snapshot.models.filter((model) => model.kind === kind).map((model) => model.id);
}

export async function explain(error: unknown, modelId?: string): Promise<string> {
  if (!isModelflareError(error)) return error instanceof Error ? error.message : String(error);
  let modelListed: boolean | undefined;
  if (error.kind === "model_not_found" && modelId) {
    modelListed = await modelflare()
      .directory.isListed(modelId)
      .catch(() => undefined);
  }
  return describeError(error, {
    locale: "en",
    utmSource: UTM_SOURCE,
    ...(modelListed !== undefined ? { modelListed } : {}),
  });
}
