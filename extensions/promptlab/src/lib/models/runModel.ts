import { AI, LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { JSONObject } from "../common/types";
import { Model } from "./types";
import { ExtensionPreferences } from "../preferences/types";
import fetch from "node-fetch";
import {
  RAYCAST_AI_FALLBACK_MODEL,
  RAYCAST_AI_REPRESENTATIONS,
  RaycastAIRepresentation,
  getFinalSchema,
  valueForKeyPath,
} from "./model-utils";

/**
 * Gets the text response from the model endpoint.
 *
 * @param prompt The full prompt to send to the endpoint.
 * @returns The string output received from the model endpoint.
 */
export default async function runModel(basePrompt: string, prompt: string, input: string, temperature = "1.0") {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const preferenceModel: Model = {
    endpoint: preferences.modelEndpoint,
    authType: preferences.authType,
    apiKey: preferences.apiKey,
    inputSchema: preferences.inputSchema,
    outputKeyPath: preferences.outputKeyPath,
    outputTiming: preferences.outputTiming,
    lengthLimit: preferences.lengthLimit,
    temperature: temperature,
    name: "",
    description: "",
    favorited: false,
    id: "",
    icon: "",
    iconColor: "",
    notes: "",
    isDefault: false,
  };

  const fallbackModel = { ...RAYCAST_AI_FALLBACK_MODEL, temperature: temperature };

  const temp = preferences.includeTemperature
    ? parseFloat(temperature) == undefined
      ? 1.0
      : parseFloat(temperature)
    : 1.0;

  return Promise.resolve(LocalStorage.allItems()).then(async (items) => {
    const models: Model[] = Object.entries(items)
      .filter(([key]) => key.startsWith("--model-"))
      .map(([, value]) => JSON.parse(value));

    const defaultModel = models.find((model) => model.isDefault);
    const targetModel = defaultModel || (preferenceModel.endpoint == "" ? fallbackModel : preferenceModel);
    const raycastModel =
      RAYCAST_AI_REPRESENTATIONS.includes(targetModel.endpoint.toLowerCase() as RaycastAIRepresentation) ||
      targetModel.endpoint == "" ||
      targetModel.apiKey == "N/A" ||
      preferenceModel.endpoint == "";

    // If the endpoint is a URL, use the fetch hook
    const headers: { [key: string]: string } = {
      method: "POST",
      "Content-Type": "application/json",
    };

    // Add the authentication header if necessary
    if (targetModel.apiKey.length != 0) {
      if (targetModel.authType == "apiKey") {
        headers["Authorization"] = `Api-Key ${targetModel.apiKey.trim()}`;
      } else if (targetModel.authType == "bearerToken") {
        headers["Authorization"] = `Bearer ${targetModel.apiKey.trim()}`;
      } else if (targetModel.authType == "x-api-key") {
        headers["X-API-Key"] = `${targetModel.apiKey.trim()}`;
      }
    }

    const modelSchema = raycastModel ? {} : getFinalSchema(targetModel, prompt, basePrompt, input, preferences);

    if (preferences.includeTemperature) {
      modelSchema["temperature"] = temp;
    }

    if (raycastModel) {
      // If the endpoint is Raycast AI, use the AI hook
      if (!environment.canAccess(AI)) {
        return "Raycast AI is not available in this environment.";
      }

      return await AI.ask(preferences.promptPrefix + prompt + preferences.promptSuffix, {
        creativity: temp,
        model: "gpt-3.5-turbo",
      });
    } else {
      const fetchResponse = await fetch(targetModel.endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(modelSchema),
      });

      if (targetModel.outputTiming == "sync") {
        // Send the request and wait for the complete response
        const response = fetchResponse;
        if (response.ok) {
          try {
            const jsonData = await response.json();
            return valueForKeyPath(jsonData as JSONObject, targetModel.outputKeyPath) as string;
          } catch {
            return "Couldn't parse model output";
          }
        } else {
          return response.statusText;
        }
      } else if (targetModel.outputTiming == "async") {
        // Send the request and parse each data chunk as it arrives
        const response = fetchResponse;

        if (response.ok && response.body != null) {
          const jsonData = (await response.text()).split("\n").map((line) => {
            try {
              return JSON.parse(line.replace(/data: ?/g, ""));
            } catch {
              return undefined;
            }
          });

          const texts = jsonData.map((entry) => {
            if (entry == undefined) {
              return "";
            } else {
              return valueForKeyPath(entry as JSONObject, targetModel.outputKeyPath) as string;
            }
          });

          let text = "";
          texts.forEach((t) => {
            if (t?.length) {
              text += t.replaceAll(text, "");
            }
          });
          return text;
        } else {
          return response.statusText;
        }
      }
    }
  });
}
