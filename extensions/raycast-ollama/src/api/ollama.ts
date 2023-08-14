import {
  OllamaApiGenerateResponseUndone,
  OllamaApiGenerateResponseDone,
  OllamaApiGenerateRequestBody,
  OllamaApiEmbeddingsResponse,
} from "./types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorOllamaNotInstalledOrRunning,
  MessageOllamaModelNotInstalled,
} from "./errors";
import fetch from "node-fetch";
import { EventEmitter } from "stream";

/**
 * Perform text generation with the selected model.
 * @param {OllamaApiGenerateRequestBody} body - Ollama Generate Body Request.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponseDone` object contains all metadata of inference.
 */
export async function OllamaApiGenerate(body: OllamaApiGenerateRequestBody): Promise<EventEmitter> {
  const url = "http://127.0.0.1:11434/api/generate";
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

/**
 * Perform text embeddings with the selected model.
 * @param {string} prompt - text used for embeddings.
 * @param {string} model - Model name.
 * @returns {Promise<OllamaApiEmbeddingsResponse>} Ollama API embeddings response.
 */
export async function OllamaApiEmbeddings(prompt: string, model: string): Promise<OllamaApiEmbeddingsResponse> {
  const url = "http://127.0.0.1:11434/api/embeddings";
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
