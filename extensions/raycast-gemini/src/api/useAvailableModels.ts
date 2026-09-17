import { getPreferenceValues } from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import { useCachedPromise } from "@raycast/utils";
import { MODEL_MIGRATIONS } from "./modelMigrations";

export interface AvailableModel {
  name: string;
  displayName: string;
}

async function fetchAvailableModels(apiKey: string): Promise<AvailableModel[]> {
  if (!apiKey || apiKey.trim().length === 0) {
    return [];
  }

  const genAI = new GoogleGenAI({ apiKey });
  const models: AvailableModel[] = [];

  try {
    const result = await genAI.models.list({ config: { queryBase: true, pageSize: 100 } });
    for await (const model of result) {
      if (!model.supportedActions?.includes("generateContent") || !model.name) {
        continue;
      }
      const name = model.name.replace(/^models\//, "");
      // Google still lists models that 404 for new users (e.g. gemini-2.5-flash-lite).
      // Filter out any model we know is deprecated/disabled.
      if (MODEL_MIGRATIONS[name]) {
        continue;
      }
      models.push({
        name,
        displayName: model.displayName ?? name,
      });
    }
  } catch (error) {
    console.error("Failed to fetch available models:", error);
    return [];
  }

  models.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return models;
}

export function useAvailableModels(): { models: AvailableModel[]; isLoading: boolean } {
  const { apiKey } = getPreferenceValues<Preferences>();
  const { isLoading, data } = useCachedPromise(fetchAvailableModels, [apiKey]);

  return { models: data ?? [], isLoading };
}
