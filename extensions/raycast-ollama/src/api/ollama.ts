import {
  OllamaApiGenerateResponse,
  OllamaApiGenerateRequestBody,
  OllamaApiEmbeddingsResponse,
  OllamaApiTagsResponse,
  OllamaApiPullResponse,
  OllamaApiShowResponse,
  OllamaApiShowModelfile,
  OllamaApiChatRequestBody,
  OllamaApiChatResponse,
  OllamaApiVersionResponse,
} from "./types";
import {
  ErrorOllamaCustomModel,
  ErrorOllamaModelNotInstalled,
  ErrorOllamaNotInstalledOrRunning,
  ErrorOllamaModelRegistryUnreachable,
  MessageOllamaModelNotInstalled,
  ErrorOllamaVersion,
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
 * Parse Ollama Host URL from preferences for langchain.
 * @returns {string} Parsed Ollama Host route for langchain.
 */
export function parseOllamaUrlForLangchain(): string {
  let url: string;
  url = (preferences.ollamaHost as string).replace("localhost", "127.0.0.1");
  if (url[url.length - 1] === "/") url = url.substring(0, url.length - 1);
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
 * Get Ollama Version.
 * @returns {Promise<string>} Ollama Version.
 */
export async function OllamaApiVersion(): Promise<string> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/version`;

  const data = await fetch(url)
    .then((response) => response.json())
    .then((output): OllamaApiVersionResponse => {
      return output as OllamaApiVersionResponse;
    })
    .catch((err) => {
      console.error(err);
      if (err.type && err.type === "ECONNREFUSED") throw ErrorOllamaNotInstalledOrRunning;
      throw ErrorOllamaVersion;
    });

  return data.version;
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
 * Show model details.
 * @param {string} model Model name.
 * @returns {Promise<OllamaApiShowResponse>} Model details.
 */
export async function OllamaApiShow(model: string): Promise<OllamaApiShowResponse> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/show`;

  const body = {
    name: model,
  };

  const data = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (!response.ok) {
        throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, model);
      }
      return response.json();
    })
    .then((output): OllamaApiShowResponse => {
      return output as OllamaApiShowResponse;
    })
    .catch((err) => {
      if (err instanceof ErrorOllamaModelNotInstalled) {
        throw err;
      }
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });

  return data;
}

/**
 * Return OllamaApiShowResponse Modelfile parameters.
 * @param {OllamaApiShowResponse} show - Ollama Api Show Response.
 * @returns {OllamaApiShowModelfile} Modelfile parameters.
 */
export function OllamaApiShowParseModelfile(show: OllamaApiShowResponse): OllamaApiShowModelfile {
  const modelfile = show.modelfile;
  const template = show.template;
  const parameters = show.parameters ? show.parameters.split("\n") : [];

  const from = modelfile.match(/^FROM[ ]+([a-zA-Z0-9:./]+)\n/m)?.[1];

  const parameterMirostat = parameters
    .filter((param) => param.search(/^mirostat[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^mirostat[  ]+(.*)/m)?.[1])?.[0];
  const parameterMirostatEta = parameters
    .filter((param) => param.search(/^mirostat_eta[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^mirostat_eta[  ]+(.*)/m)?.[1])?.[0];
  const parameterMirostatTau = parameters
    .filter((param) => param.search(/^mirostat_tau[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^mirostat_tau[  ]+(.*)/m)?.[1])?.[0];
  const parameterNumCtx = parameters
    .filter((param) => param.search(/^num_ctx[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^num_ctx[  ]+(.*)/m)?.[1])?.[0];
  const parameterNumGqa = parameters
    .filter((param) => param.search(/^num_gqa[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^num_gqa[  ]+(.*)/m)?.[1])?.[0];
  const parameterNumGpu = parameters
    .filter((param) => param.search(/^num_gpu[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^num_gpu[  ]+(.*)/m)?.[1])?.[0];
  const parameterNumThread = parameters
    .filter((param) => param.search(/^num_thread[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^num_thread[  ]+(.*)/m)?.[1])?.[0];
  const parameterRepeatLastN = parameters
    .filter((param) => param.search(/^repeat_last_n[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^repeat_last_n[  ]+(.*)/m)?.[1])?.[0];
  const parameterRepeatPenalty = parameters
    .filter((param) => param.search(/^repeat_penalty[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^repeat_penalty[  ]+(.*)/m)?.[1])?.[0];
  const parameterTemperature = parameters
    .filter((param) => param.search(/^temperature[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^temperature[  ]+(.*)/m)?.[1])?.[0];
  const parameterSeed = parameters
    .filter((param) => param.search(/^seed[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^seed[  ]+(.*)/m)?.[1])?.[0];
  const parameterStop = parameters
    .filter((param) => param.search(/^stop[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^stop[  ]+(.*)/m)?.[1]);
  const parameterTfsZ = parameters
    .filter((param) => param.search(/^tfs_z[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^tfs_z[  ]+(.*)/m)?.[1])?.[0];
  const parameterNumPredict = parameters
    .filter((param) => param.search(/^num_predict[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^num_predict[  ]+(.*)/m)?.[1])?.[0];
  const parameterTopK = parameters
    .filter((param) => param.search(/^top_k[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^top_k[  ]+(.*)/m)?.[1])?.[0];
  const parameterTopP = parameters
    .filter((param) => param.search(/^top_p[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^top_p[  ]+(.*)/m)?.[1])?.[0];

  let system: string | undefined;
  const systemIndexStart = modelfile.search(/^SYSTEM[  ]+(.*)/m);
  if (systemIndexStart !== -1) {
    system = modelfile.substring(systemIndexStart).split('"""')?.[1];
  }

  const adapter = parameters
    .filter((param) => param.search(/^ADAPTER[  ]+(.*)/m) !== -1)
    .map((param) => param.match(/^ADAPTER[  ]+(.*)/m)?.[1])?.[0];

  let license: string | undefined;
  const licenseIndexStart = modelfile.search(/^SYSTEM[  ]+(.*)/m);
  if (licenseIndexStart !== -1) {
    system = modelfile.substring(licenseIndexStart).split('"""')?.[1];
  }

  return {
    from: from ?? "",
    parameter: {
      mirostat: parameterMirostat ? Number(parameterMirostat) : 0,
      mirostat_eta: parameterMirostatEta ? Number(parameterMirostatEta) : 0.1,
      mirostat_tau: parameterMirostatTau ? Number(parameterMirostatTau) : 5.0,
      num_ctx: parameterNumCtx ? Number(parameterNumCtx) : 2048,
      num_gqa: parameterNumGqa ? Number(parameterNumGqa) : undefined,
      num_gpu: parameterNumGpu ? Number(parameterNumGpu) : 1,
      num_thread: parameterNumThread ? Number(parameterNumThread) : undefined,
      repeat_last_n: parameterRepeatLastN ? Number(parameterRepeatLastN) : 64,
      repeat_penalty: parameterRepeatPenalty ? Number(parameterRepeatPenalty) : 1.1,
      temperature: parameterTemperature ? Number(parameterTemperature) : 0.8,
      seed: parameterSeed ? Number(parameterSeed) : 0,
      stop: parameterStop,
      tfs_z: parameterTfsZ ? Number(parameterTfsZ) : 1,
      num_predict: parameterNumPredict ? Number(parameterNumPredict) : 128,
      top_k: parameterTopK ? Number(parameterTopK) : 40,
      top_p: parameterTopP ? Number(parameterTopP) : 0.9,
    },
    template: template,
    system: system,
    adapter: adapter,
    license: license,
  };
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
            let json: OllamaApiPullResponse | undefined;
            const buffer = Buffer.from(chunk);
            try {
              json = JSON.parse(buffer.toString());
            } catch (err) {
              console.error(err);
            }
            if (json)
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
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
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
            let json: OllamaApiGenerateResponse | undefined;
            const buffer = Buffer.from(chunk);
            try {
              json = JSON.parse(buffer.toString());
            } catch (err) {
              console.error(err);
            }
            if (json)
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
 * Perform conversation with the selected model.
 * @param {OllamaApiChatRequestBody} body - Ollama Chat Body Request.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiChatResponse` object contains all metadata of inference.
 */
export async function OllamaApiChat(body: OllamaApiChatRequestBody): Promise<EventEmitter> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/chat`;
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
            let json: OllamaApiChatResponse | undefined;
            const buffer = Buffer.from(chunk);
            try {
              json = JSON.parse(buffer.toString());
            } catch (err) {
              console.error(err);
            }
            if (json)
              switch (json.done) {
                case false:
                  json.message && e.emit("data", json.message.content);
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
 * Perform text generation with the selected model without stream.
 * @param {OllamaApiGenerateRequestBody} body - Ollama Generate Body Request.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
 */
export async function OllamaApiGenerateNoStream(
  body: OllamaApiGenerateRequestBody
): Promise<OllamaApiGenerateResponse> {
  const host = parseOllamaHostUrl();
  const url = `${host}api/generate`;

  body.stream = false;

  const response: OllamaApiGenerateResponse | undefined = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }

      if (response.status === 400) {
        throw new ErrorOllamaModelNotInstalled(MessageOllamaModelNotInstalled.message, body.model);
      }
    })
    .then((json) => {
      return json as OllamaApiGenerateResponse;
    })
    .catch((err) => {
      if (err instanceof ErrorOllamaModelNotInstalled) {
        throw err;
      }
      console.error(err);
      throw ErrorOllamaNotInstalledOrRunning;
    });

  return response;
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
