import { AI, environment, getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences, modelOutput } from "../utils/types";
import fetch from "node-fetch";

/**
 * Gets the text response from the model endpoint.
 *
 * @param prompt The full prompt to send to the endpoint.
 * @returns The string output received from the model endpoint.
 */
export default async function runModel(basePrompt: string, prompt: string, input: string) {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // We can be a little forgiving of how users specify Raycast AI
  const validRaycastAIReps = ["raycast ai", "raycastai", "raycast", "raycast-ai"];

  if (validRaycastAIReps.includes(preferences.modelEndpoint.toLowerCase()) || preferences.modelEndpoint.trim() == "") {
    // If the endpoint is Raycast AI, use the AI hook
    if (!environment.canAccess(AI)) {
      ("");
    }
    return await AI.ask(preferences.promptPrefix + prompt + preferences.promptSuffix);
  } else if (preferences.modelEndpoint.includes(":")) {
    // If the endpoint is a URL, use the fetch hook
    const headers: { [key: string]: string } = {
      method: "POST",
      "Content-Type": "application/json",
    };

    // Get the value at the specified key path
    const get = (obj: modelOutput | string, pathString: string, def?: string) => {
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
          if (!(current as modelOutput)[path[i]]) return def;
          current = (current as modelOutput)[path[i]];
        }
      }
      return current;
    };

    // Add the authentication header if necessary
    if (preferences.authType == "apiKey") {
      headers["Authorization"] = `Api-Key ${preferences.apiKey}`;
    } else if (preferences.authType == "bearerToken") {
      headers["Authorization"] = `Bearer ${preferences.apiKey}`;
    } else if (preferences.authType == "x-api-key") {
      headers["X-API-Key"] = `${preferences.apiKey}`;
    }

    if (preferences.outputTiming == "sync") {
      // Send the request and wait for the complete response
      const response = await fetch(preferences.modelEndpoint, {
        method: "POST",
        headers: headers,
        body: preferences.inputSchema
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
            preferences.inputSchema.includes("{prompt") && prompt == input
              ? ""
              : input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix
          ),
      });

      if (response.ok) {
        try {
          const jsonData = await response.json();
          return get(jsonData as modelOutput, preferences.outputKeyPath) as string;
        } catch {
          return "Couldn't parse model output";
        }
      } else {
        return response.statusText;
      }
    } else if (preferences.outputTiming == "async") {
      // Send the request and parse each data chunk as it arrives
      const response = await fetch(preferences.modelEndpoint, {
        method: "POST",
        headers: headers,
        body: preferences.inputSchema
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
          .replace("{input}", input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix),
      });

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
            return get(entry as modelOutput, preferences.outputKeyPath) as string;
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
}
