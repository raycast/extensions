import { AI, LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences, JSONObject, Model } from "../utils/types";
import fetch from "node-fetch";

/**
 * Gets the text response from the model endpoint.
 *
 * @param prompt The full prompt to send to the endpoint.
 * @returns The string output received from the model endpoint.
 */
export default async function runModel(basePrompt: string, prompt: string, input: string, temperature = "1.0") {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // We can be a little forgiving of how users specify Raycast AI
  const validRaycastAIReps = [
    "raycast ai",
    "raycastai",
    "raycast",
    "raycast-ai",
    "raycast ai 3.5",
    "raycast gpt 4",
    "raycast 4",
    "raycast ai 4",
  ];

  const fallbackModel: Model = {
    endpoint: "Raycast AI",
    authType: "",
    apiKey: "",
    inputSchema: "",
    outputKeyPath: "",
    outputTiming: "async",
    lengthLimit: "2500",
    temperature: temperature,
    name: "Text-Davinci-003 Via Raycast AI",
    description: "",
    favorited: false,
    id: "",
    icon: "",
    iconColor: "",
    notes: "",
    isDefault: false,
  };

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
      validRaycastAIReps.includes(targetModel.endpoint.toLowerCase()) ||
      targetModel.endpoint == "" ||
      preferenceModel.endpoint == "";

    // Get the value at the specified key path
    const get = (obj: JSONObject | string | string[] | JSONObject[], pathString: string, def?: string) => {
      const path: string[] = [];

      // Split the key path string into an array of keys
      pathString
        .trim()
        .split(".")
        .forEach(function (item) {
          item.split(/\[([^}]+)\]/g).forEach(function (key) {
            if (key.length > 0) {
              path.push(key);
            }
          });
        });

      let current = obj;
      if (typeof current == "object") {
        for (let i = 0; i < path.length; i++) {
          if (!(current as JSONObject)[path[i]]) return def;
          current = (current as JSONObject)[path[i]];
        }
      }
      return current;
    };

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

    const modelSchema = raycastModel
      ? {}
      : JSON.parse(
          targetModel.inputSchema
            .replace(
              "{prompt}",
              preferences.promptPrefix +
                prompt.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') +
                preferences.promptSuffix
            )
            .replace(
              "{basePrompt}",
              preferences.promptPrefix + basePrompt.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"')
            )
            .replace(
              "{input}",
              targetModel.inputSchema.includes("{prompt") && prompt == input
                ? ""
                : input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix
            )
        );

    if (preferences.includeTemperature) {
      modelSchema["temperature"] = temp;
    }

    if (raycastModel) {
      // If the endpoint is Raycast AI, use the AI hook
      if (!environment.canAccess(AI)) {
        return "Raycast AI is not available in this environment.";
      }

      return await AI.ask(preferences.promptPrefix + prompt + preferences.promptSuffix, { creativity: temp });
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
            return get(jsonData as JSONObject, targetModel.outputKeyPath) as string;
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
            } catch (error) {
              return undefined;
            }
          });

          const texts = jsonData.map((entry) => {
            if (entry == undefined) {
              return "";
            } else {
              return get(entry as JSONObject, targetModel.outputKeyPath) as string;
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
