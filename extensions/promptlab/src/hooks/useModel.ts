import { AI, environment, getPreferenceValues } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { ExtensionPreferences, Model, JSONObject } from "../utils/types";
import { useEffect, useRef, useState } from "react";
import fetch, { Response } from "node-fetch";
import { useModels } from "./useModels";
import { filterString } from "../utils/context-utils";

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
  execute: boolean,
  modelOverride?: Model
) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [data, setData] = useState<string>("");
  const [error] = useState<string>();
  const [dataTag, setDataTag] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(execute);
  const [attempt, setAttempt] = useState<number>(0);
  const models = useModels();
  const AIRef = useRef<{ fetch: Promise<Response>; tag: string; forceStop: () => void }>();

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
    temperature: "1.0",
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
    temperature: "1.0",
    name: "",
    description: "",
    favorited: false,
    id: "",
    icon: "",
    iconColor: "",
    notes: "",
    isDefault: false,
  };
  const defaultModel = models.models.find((model) => model.isDefault);
  const targetModel =
    modelOverride || defaultModel || (preferenceModel.endpoint == "" ? fallbackModel : preferenceModel);
  const raycastModel =
    validRaycastAIReps.includes(targetModel.endpoint.toLowerCase()) ||
    targetModel.endpoint == "" ||
    (models.isLoading && !modelOverride && preferenceModel.endpoint == "");

  const temp = preferences.includeTemperature
    ? parseFloat(temperature) == undefined
      ? 1.0
      : parseFloat(temperature)
    : 1.0;

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

  useEffect(() => {
    if (raycastModel || !execute) {
      return;
    }

    if (AIRef.current == undefined && execute && prompt?.length && !isLoading) {
      const fetchAI = fetch(targetModel.endpoint, {
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
            targetModel.inputSchema.includes("{prompt") && prompt == input
              ? ""
              : input.replaceAll(/[\n\r\s]+/g, " ").replaceAll('"', '\\"') + preferences.promptSuffix
          ),
      });
      const tag = basePrompt + prompt + input;
      const forceStop = () => {
        fetchAI.then((response) => {
          response.body?.emit("close");
        });
      };
      AIRef.current = { fetch: fetchAI, tag: tag, forceStop: forceStop };
    }

    setIsLoading(true);
    const me = AIRef.current;
    AIRef.current?.fetch
      ?.then((response) => {
        if (response.ok && targetModel.outputTiming == "sync") {
          response.json().then((json) => {
            const output = get(json as JSONObject, targetModel.outputKeyPath) as string;
            setData(output);
          });
        } else if (response.ok && targetModel.outputTiming == "async") {
          let text = "";
          setDataTag(basePrompt + prompt + input);
          response.body?.on("data", (chunk: string) => {
            const jsonString = chunk.toString();
            jsonString.split("\n").forEach((line) => {
              if (
                me != AIRef.current &&
                AIRef.current != undefined &&
                AIRef.current.tag != basePrompt + prompt + input
              ) {
                me?.forceStop();
                return;
              }
              if (line.startsWith("data: [DONE]")) {
                // Done
              } else if (line.startsWith("data: ")) {
                try {
                  const jsonData = JSON.parse(line.substring(5));
                  const output = get(jsonData, targetModel.outputKeyPath) || "";
                  if (output.toString().includes(text)) {
                    text = output.toString();
                  } else {
                    text = text + output;
                  }
                  if (me?.tag == basePrompt + prompt + input) {
                    setData(text);
                  }
                } catch (e) {
                  console.log((e as Error).message, line.substring(line.length - 100));
                }
              } else {
                try {
                  const jsonData = JSON.parse(line);
                  const output = get(jsonData, targetModel.outputKeyPath) || "";
                  if (output.toString().includes(text)) {
                    text = output.toString();
                  } else {
                    text = text + output;
                  }
                  if (me?.tag == basePrompt + prompt + input) {
                    setData(text);
                  }
                } catch (e) {
                  console.log((e as Error).message, line.substring(line.length - 100));
                }
              }
            });
          });
          response.body?.on("close", () => {
            setIsLoading(false);
            AIRef.current = undefined;
          });
        }
      })
      .finally(() => {
        if (me != AIRef.current) {
          me?.forceStop();
          return;
        }
      });
  }, [execute, basePrompt, input, prompt, attempt]);

  const stopModel = () => {
    AIRef.current?.fetch?.then((response) => {
      response.body?.emit("close");
    });
    AIRef.current = undefined;
  };

  const res = environment.canAccess(AI)
    ? {
        ...useAI(filterString(preferences.promptPrefix + prompt + preferences.promptSuffix, 5000), {
          execute: execute,
          creativity: temp,
          model: targetModel.endpoint == "Raycast AI 3.5" ? "gpt-3.5-turbo" : "text-davinci-003",
        }),
        dataTag: basePrompt + prompt + input,
        stopModel: stopModel,
      }
    : {
        data: data,
        isLoading: execute,
        revalidate: () => null,
        error: error,
        dataTag: dataTag,
        stopModel: stopModel,
      };

  if (!basePrompt?.length && !prompt?.length) {
    console.error("Prompt cannot be empty");
    return {
      data: "",
      isLoading: false,
      revalidate: () => null,
      error: "Prompt cannot be empty",
      dataTag: "",
      stopModel: stopModel,
    };
  }

  const revalidate = async () => {
    if (AIRef.current != undefined) {
      AIRef.current.forceStop();
      AIRef.current = undefined;
    }
    setAttempt(attempt + 1);
  };

  if (validRaycastAIReps.includes(targetModel.endpoint.toLowerCase()) || models.isLoading) {
    // If the endpoint is Raycast AI, use the AI hook
    if (models.isLoading) {
      return {
        data: "",
        isLoading: execute,
        revalidate: () => null,
        error: undefined,
        dataTag: basePrompt + prompt + input,
        stopModel: stopModel,
      };
    } else {
      return res;
    }
  } else if (targetModel.endpoint.includes(":")) {
    return {
      data: data,
      isLoading: isLoading,
      revalidate: revalidate,
      error: error,
      dataTag: dataTag,
      stopModel: stopModel,
    };
  }

  // If the endpoint is invalid, return an error
  console.error("Invalid Model Endpoint");
  return {
    data: "",
    isLoading: false,
    revalidate: () => null,
    error: "Invalid Endpoint",
    dataTag: "",
    stopModel: stopModel,
  };
}
