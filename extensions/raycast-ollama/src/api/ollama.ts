import {
  OllamaApiGenerateResponse,
  OllamaApiGenerateRequestBody,
  OllamaApiEmbeddingsResponse,
  OllamaApiTagsResponse,
  OllamaApiPullResponse,
} from "./types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorOllamaNotInstalledOrRunning,
  ErrorOllamaModelRegistryUnreachable,
  MessageOllamaModelNotInstalled,
} from "./errors";
import fetch from "node-fetch";
import { EventEmitter } from "stream";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

/**
 * Parse Ollama Host URL from preferences.
 * @returns {string} Parsed Ollama Host route
 */
function parseOllamaHostUrl(): string {
  let url: string;
  url = (preferences.ollamaHost as string).replace("localhost", "127.0.0.1");
  if (url[url.length - 1] !== "/") url += "/";
  return url;
}

/**
 * Get available models on ollama registry.
 * @returns {Promise<string[]>} List of models.
 */
export async function OllamaAvailableModelsOnRegistry(): Promise<string[]> {
  const url =
    "https://gist.githubusercontent.com/mchiang0610/942e93fef378e36e6d44edf24756c723/raw/aad73c72a1a8ed3dd24421856a58afa7af56dc4d/ollama_lib_081623";

  const data = await fetch(url)
    .then((response) => {
      if (response.ok) {
        return response.text();
      }
      throw Error(response.status.toString());
    })
    .then((output): string[] => {
      const a: string[] = [];
      output.split("\n").forEach((line) => {
        a.push(line);
      });
      return a;
    })
    .catch((err) => {
      console.error(err);
      throw ErrorOllamaModelRegistryUnreachable;
    });

  return data;
}

/**
 * Get installed model.
 * @returns {Promise<OllamaApiTagsResponse>} List of installed models.
 */
export async function OllamaApiTags(): Promise<OllamaApiTagsResponse> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/tags`;

  const data = await fetch(url)
    .then((response) => response.json())
    .then((output): OllamaApiTagsResponse => {
      return output as OllamaApiTagsResponse;
    })
    .catch((err) => {
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });

  return data;
}

/**
 * Delete model.
 * @param {string} model Model name.
 */
export async function OllamaApiDelete(model: string): Promise<void> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/delete`;
  const body = {
    name: model,
  };

  await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, model);
      }
    })
    .catch((err) => {
      if (err instanceof ErrorOllamaModelNotInstalled) {
        throw err;
      }
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });
}

/**
 * Pull model.
 * @param {string} model Model name.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with three event:
 *  - {string} `message` - Message from the Ollama API.
 *  - {string} `error` - Error from the Ollama API.
 *  - {number} `downloading` - Downloading percentage.
 *  - {string} `done` - On download completed.
 */
export async function OllamaApiPull(model: string): Promise<EventEmitter> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/pull`;
  const body = {
    name: model,
  };
  let emitter: EventEmitter | undefined;

  while (emitter === undefined) {
    emitter = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(async (response) => response.body)
      .then((body) => {
        if (body === undefined) {
          return undefined;
        }

        const e = new EventEmitter();

        body?.on("data", (chunk) => {
          if (chunk !== undefined) {
            const buffer = Buffer.from(chunk);
            const json: OllamaApiPullResponse = JSON.parse(buffer.toString());
            if (json.total && json.completed) {
              e.emit("downloading", json.completed / json.total);
            } else if (json.status === "success") {
              e.emit("done", "Download completed");
            } else if (json.error) {
              e.emit("error", json.error);
            } else {
              e.emit("message", json.status);
            }
          }
        });

        return e;
      })
      .catch((err) => {
        console.error(err);
        throw ErrorOllamaNotInstalledOrRunning;
      });
  }
  return emitter;
}

/**
 * Perform text generation with the selected model.
 * @param {OllamaApiGenerateRequestBody} body - Ollama Generate Body Request.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference..
 */
export async function OllamaApiGenerate(body: OllamaApiGenerateRequestBody): Promise<EventEmitter> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/generate`;
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
          throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, body.model);
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
            const json: OllamaApiGenerateResponse = JSON.parse(buffer.toString());
            switch (json.done) {
              case false:
                e.emit("data", json.response);
                break;
              case true:
                e.emit("done", json);
            }
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

/**
 * Perform text embeddings with the selected model.
 * @param {string} prompt - text used for embeddings.
 * @param {string} model - Model name.
 * @returns {Promise<OllamaApiEmbeddingsResponse>} Ollama API embeddings response.
 */
export async function OllamaApiEmbeddings(prompt: string, model: string): Promise<OllamaApiEmbeddingsResponse> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/embeddings`;
  const body: OllamaApiGenerateRequestBody = {
    model: model,
    prompt: prompt,
  };
  let embeddings: OllamaApiEmbeddingsResponse | undefined;

  while (embeddings === undefined) {
    embeddings = await fetch(url, {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        if (response.ok) {
          return response;
        }

        if (response.status === 400) {
          throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, body.model);
        }
      })
      .then(async (response) => {
        if (response === undefined) {
          return undefined;
        }
        return (await response.json()) as OllamaApiEmbeddingsResponse;
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
  return embeddings;
}
