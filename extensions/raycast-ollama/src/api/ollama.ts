import {
  OllamaApiTagsResponse,
  OllamaApiGenerateResponseUndone,
  OllamaApiGenerateResponseDone,
  OllamaApiCreateRequestBody,
  OllamaApiGenerateRequestBody,
} from "./types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorOllamaNotInstalledOrRunning,
  ErrorOllamaCantCreateCustomModel,
  MessageOllamaModelNotInstalled,
} from "./errors";
import { environment } from "@raycast/api";
import fetch from "node-fetch";
import { EventEmitter } from "stream";

/**
 * Verify if a specific model is installed.
 * @param {string} model - Model name.
 * @returns {Promise<[boolean, string]>} [true, model] if model is installed, [false, model] if not.
 */
async function OllamaApiTagsVerify(model: string): Promise<[boolean, string]> {
  const url = "http://127.0.0.1:11434/api/tags";
  const ModelMap = new Map<string, string>([
    ["raycast_orca:3b", "orca:latest"],
    ["raycast_llama2:7b", "llama2:latest"],
    ["raycast_llama2:13b", "llama2:13b"],
  ]);

  const models = await fetch(url)
    .then((response) => response.text())
    .then((output): OllamaApiTagsResponse => {
      return JSON.parse(output);
    })
    .catch((err) => {
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });

  let modelIsInstalled = false;
  models.models.forEach((row) => {
    if (ModelMap.get(model) === row.name) {
      modelIsInstalled = true;
    }
  });
  return [modelIsInstalled, ModelMap.get(model) as string];
}

/**
 * Create a custom model from a file template.
 * @param {string} model - Model name. Can be one of the following: raycast_orca:3b, raycast_llama2:7b, raycast_llama2:13b.
 * @returns {Promise<boolean>} true if model is created, false if not.
 */
function OllamaApiCreateModel(model: string): Promise<boolean> {
  const url = "http://127.0.0.1:11434/api/create";
  const ModelFileMap = new Map<string, string>([
    ["raycast_orca:3b", `${environment.assetsPath}/prompt/raycast_orca_3b`],
    ["raycast_llama2:7b", `${environment.assetsPath}/prompt/raycast_llama2_7b`],
    ["raycast_llama2:13b", `${environment.assetsPath}/prompt/raycast_llama2_13b`],
  ]);
  const body: OllamaApiCreateRequestBody = {
    name: model,
    path: ModelFileMap.get(model) as string,
  };

  return fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (response.ok) {
        return response.text();
      }

      throw new ErrorOllamaCustomModel(ErrorOllamaCantCreateCustomModel.message, body.name, body.path);
    })
    .then(() => true)
    .catch((err) => {
      if (err instanceof ErrorOllamaCustomModel) {
        throw err;
      }
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });
}

/**
 * Perform text generation with the selected model.
 * @param {string} prompt - Prompt to be used in the generation.
 * @param {string} model - Model name. Need to be installed or one of the following: raycast_orca:3b, raycast_llama2:7b, raycast_llama2:13b.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponseDone` object contains all metadata of inference.
 */
export async function OllamaApiGenerate(prompt: string, model: string): Promise<EventEmitter> {
  const url = "http://127.0.0.1:11434/api/generate";
  const body: OllamaApiGenerateRequestBody = {
    model: model,
    prompt: prompt,
  };
  let emitter: EventEmitter | undefined;

  while (emitter === undefined) {
    emitter = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        if (response.ok) {
          return response.body;
        }

        if (response.status === 400) {
          return await OllamaApiTagsVerify(model).then(async (modelIsInstalled) => {
            if (modelIsInstalled[0]) {
              await OllamaApiCreateModel(model)
                .then(() => {
                  return undefined;
                })
                .catch((err) => {
                  throw err;
                });
            } else {
              throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, modelIsInstalled[1]);
            }
          });
        }
      })
      .then((body) => {
        if (body === undefined) {
          return undefined;
        }

        const e = new EventEmitter();

        body?.on("data", (chunk) => {
          if (chunk !== undefined) {
            const buffer = Buffer.from(chunk);
            const json: OllamaApiGenerateResponseUndone = JSON.parse(buffer.toString());
            if (json.done) {
              const lastJSON: OllamaApiGenerateResponseDone = JSON.parse(buffer.toString());
              e.emit("done", lastJSON);
            }
            if (json.response !== undefined) e.emit("data", json.response);
          }
        });

        return e;
      })
      .catch((err) => {
        if (err instanceof ErrorOllamaModelNotInstalled) {
          throw err;
        } else if (err instanceof ErrorOllamaCustomModel) {
          throw err;
        }
        console.error(err);
        throw ErrorOllamaNotInstalledOrRunning;
      });
  }
  return emitter;
}
