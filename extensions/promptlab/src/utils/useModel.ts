import { AI, environment, getPreferenceValues } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { ExtensionPreferences, modelOutput } from "./types";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

/**
 * Gets the text response from the model endpoint.
 *
 * @param prompt The full prompt to send to the endpoint.
 * @param execute Whether to execute the request immediately or wait until this value becomes true.
 * @returns The string output received from the model endpoint.
 */
export default function useModel(
  basePrompt: string,
  prompt: string,
  input: string,
  temperature: string,
  execute: boolean
) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [data, setData] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  // We can be a little forgiving of how users specify Raycast AI
  const validRaycastAIReps = ["raycast ai", "raycastai", "raycast", "raycast-ai"];

  const temp = preferences.includeTemperature ? parseFloat(temperature) || 1.0 : 1.0;
  if (validRaycastAIReps.includes(preferences.modelEndpoint.toLowerCase())) {
    // If the endpoint is Raycast AI, use the AI hook
    if (!environment.canAccess(AI)) {
      return {
        data: "",
        isLoading: false,
        revalidate: () => null,
        error: "Raycast AI is not available — Upgrade to Pro or use a different model endpoint.",
      };
    }
    return useAI(preferences.promptPrefix + prompt + preferences.promptSuffix, { execute: execute, creativity: temp });
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

    const modelSchema = JSON.parse(preferences.inputSchema);
    if (preferences.includeTemperature) {
      modelSchema["temperature"] = temp;
    }

    useEffect(() => {
      if (execute) {
        if (preferences.outputTiming == "sync") {
          // Send the request and wait for the complete response
          fetch(preferences.modelEndpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(modelSchema)
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
          }).then(async (response) => {
            if (response.ok) {
              try {
                const jsonData = await response.json();
                const output = get(jsonData as modelOutput, preferences.outputKeyPath) as string;
                setData(output);
                setIsLoading(false);
              } catch {
                setError("Couldn't parse model output");
              }
            } else {
              setError(response.statusText);
            }
          });
        } else if (preferences.outputTiming == "async") {
          // Send the request and parse each data chunk as it arrives
          fetch(preferences.modelEndpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(modelSchema)
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
                input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix
              ),
          }).then(async (response) => {
            if (response.ok && response.body != null) {
              let text = "";
              response.body.on("data", (chunk: string) => {
                const jsonString = chunk.toString();
                jsonString.split("\n").forEach((line) => {
                  if (line.includes("data:")) {
                    try {
                      const jsonData = JSON.parse(line.substring(5));
                      const output = get(jsonData, preferences.outputKeyPath) || "";
                      if (output.toString().includes(text)) {
                        text = output.toString();
                      } else {
                        text = text + output;
                      }
                      setData(text);
                    } catch (e) {
                      console.log("Failed to get JSON from model output");
                    }
                  }
                });
              });
              response.body.on("end", () => {
                setIsLoading(false);
              });
            } else {
              setError(response.statusText);
            }
          });
        }
      }
    }, [execute]);

    return {
      data: data,
      isLoading: isLoading,
      revalidate: () => null,
      error: error,
    };
  }

  // If the endpoint is invalid, return an error
  return { data: "", isLoading: false, revalidate: () => null, error: "Invalid Endpoint" };
}
