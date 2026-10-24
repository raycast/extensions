import { getPreferenceValues } from "@raycast/api";

import type { ModelKind } from "./core/classify.js";
import { ModelflareClient } from "./core/client.js";
import { isModelflareError } from "./core/errors.js";
import { describeErrorEn } from "./core/messages-en.js";
import { ModelDirectory } from "./core/models.js";

// Raycast store extensions have no package version; bump this with every
// store update so usage logs can tell releases apart.
const VERSION = "0.1.1";

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
    directory = new ModelDirectory({ client, includeProfiles: true });
  }
  return { client, directory };
}

export async function modelIds(kind: ModelKind): Promise<string[]> {
  const snapshot = await modelflare().directory.load();
  // Every text model is listed: the gateway serves `chat/completions` for all of
  // them and translates to the upstream protocol (Anthropic Messages, Responses)
  // itself, so `supported_endpoint_types` does not limit the Ask command.
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
  return describeErrorEn(error, {
    utmSource: UTM_SOURCE,
    ...(modelListed !== undefined ? { modelListed } : {}),
  });
}
