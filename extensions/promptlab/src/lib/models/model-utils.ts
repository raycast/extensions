import { JSONObject } from "../common/types";
import { Model } from "./types";
import { ExtensionPreferences } from "../preferences/types";

/**
 * Valid string representations of a Raycast AI model endpoint.
 */
export const RAYCAST_AI_REPRESENTATIONS = [
  "raycast ai",
  "raycastai",
  "raycast",
  "raycast-ai",
  "raycast ai 3.5",
  "raycast gpt 4",
  "raycast 4",
  "raycast ai 4",
] as const;

/**
 * Type of a valid string representation of a Raycast AI model endpoint.
 */
export type RaycastAIRepresentation = (typeof RAYCAST_AI_REPRESENTATIONS)[number];

/**
 * The fallback model to use if the user has not set a default model.
 */
export const RAYCAST_AI_FALLBACK_MODEL: Model = {
  endpoint: "Raycast AI",
  authType: "",
  apiKey: "",
  inputSchema: "",
  outputKeyPath: "",
  outputTiming: "async",
  lengthLimit: "2500",
  temperature: "1.0",
  name: "Text-Davinci-003 Via Raycast AI",
  description: "",
  favorited: false,
  id: "",
  icon: "",
  iconColor: "",
  notes: "",
  isDefault: false,
} as const;

/**
 * Gets the value of a key path from a JSON object.
 * @param obj The JSON object to get the value from.
 * @param pathString The key path to get the value from, e.g. "foo.bar[0].baz".
 * @param defaultValue The default value to return if the key path does not exist.
 * @returns The value of the key path, or the default value if the key path does not exist.
 */
export const valueForKeyPath = (
  obj: JSONObject | string | string[] | JSONObject[],
  pathString: string,
  defaultValue?: string,
): string => {
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
      if (!(current as JSONObject)[path[i]]) return defaultValue || "";
      current = (current as JSONObject)[path[i]];
    }
  }
  return current as string;
};

/**
 * Gets the final schema to send to the model endpoint.
 * @param targetModel The model to get the schema for.
 * @param prompt The prompt to send to the model endpoint.
 * @param basePrompt The base prompt to send to the model endpoint.
 * @param input The input to send to the model endpoint.
 * @param preferences The extension preferences object.
 * @returns The schema as a JSON object.
 */
export function getFinalSchema(
  targetModel: Model,
  prompt: string,
  basePrompt: string,
  input: string,
  preferences: ExtensionPreferences,
) {
  return JSON.parse(
    targetModel.inputSchema
      .replace(
        "{prompt}",
        preferences.promptPrefix +
          prompt.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') +
          preferences.promptSuffix,
      )
      .replace(
        "{basePrompt}",
        preferences.promptPrefix + basePrompt.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"'),
      )
      .replace(
        "{input}",
        targetModel.inputSchema.includes("{prompt") && prompt == input
          ? ""
          : input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix,
      ),
  );
}
