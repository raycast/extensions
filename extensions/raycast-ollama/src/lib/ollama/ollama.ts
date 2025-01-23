import * as Types from "./types";
import * as Enum from "./enum";
import * as Errors from "./errors";
import fetch from "node-fetch";
import { EventEmitter } from "stream";
import { RequestInit, HeadersInit } from "node-fetch";
import { FetchError } from "node-fetch";

export class Ollama {
  private _server: string;
  private _headers: HeadersInit | undefined;
  private _signal: AbortSignal;

  private _RouteApiVersion = `/api/version`;
  private _RouteApiTags = `/api/tags`;
  private _RouteApiShow = `/api/show`;
  private _RouteApiDelete = `/api/delete`;
  private _RouteApiPull = `/api/pull`;
  private _RouteApiGenerate = `/api/generate`;
  private _RouteApiChat = `/api/chat`;
  private _RouteApiEmbeddings = `/api/embeddings`;
  private _RouteApiPs = `/api/ps`;

  /**
   * @param server - Ollama Server Route, default value: { url: "http://127.0.0.1:11434" }.
   */
  constructor(server = { url: "http://127.0.0.1:11434" } as Types.OllamaServer) {
    this._signal = AbortSignal.timeout(180);
    this._server = server.url;
    if (server.auth && server.auth.mode === Enum.OllamaServerAuthorizationMethod.BASIC)
      this._headers = {
        Authorization: `${server.auth.mode} ${btoa(`${server.auth.username}:${server.auth.password}`)}`,
      };
    if (server.auth && server.auth.mode === Enum.OllamaServerAuthorizationMethod.BEARER)
      this._headers = {
        Authorization: `${server.auth.mode} ${server.auth.token}`,
      };
  }

  /**
   * @param server - Ollama Server Route.
   */
  set server(server: Types.OllamaServer) {
    this._server = server.url;
    if (server.auth && server.auth.mode === Enum.OllamaServerAuthorizationMethod.BASIC)
      this._headers = {
        Authorization: `${server.auth.mode} ${btoa(`${server.auth.username}:${server.auth.password}`)}`,
      };
    if (server.auth && server.auth.mode === Enum.OllamaServerAuthorizationMethod.BEARER)
      this._headers = {
        Authorization: `${server.auth.mode} ${server.auth.token}`,
      };
  }

  /**
   * Log `Error` on console.
   */
  private _ErrorLogger(error: FetchError | Error): void {
    if (error instanceof Errors.OllamaServerError) {
      console.error(
        `Error: Route '${error.route}', Code '${error.code}', Message: ${error.message}${
          error.req && ` Req: ${error.req}`
        }`
      );
    } else {
      console.error(`Error: ${error.message}`);
    }
    if (error.stack) console.error(`Stack trace: ${error.stack}`);
  }

  /**
   * Handler Ollama Server Error.
   *
   * @param route - Ollama Server Route.
   * @param code - Ollama Status Code Response.
   * @param message - Ollama Error Message Response.
   * @param req - Ollama Request.
   * @param model - Ollama Model Tag Name, used for `/api/show` route.
   */
  private _ErrorHandlerOllamaServer(
    route: string,
    code: number,
    message: Types.OllamaErrorResponse,
    req?: RequestInit,
    model?: string
  ): void {
    if (route in [this._RouteApiShow, this._RouteApiGenerate, this._RouteApiChat] && code === 404) {
      throw new Errors.OllamaModelNotInstalled(Errors.OllamaMessageModelNotInstalled.message, model);
    }
    if (code === 400) {
      throw new Errors.OllamaServerError(message.error, route, code, req);
    }
    if (code === 500) {
      throw new Errors.OllamaServerError(message.error, route, code);
    }
    throw new Errors.OllamaServerError(message.error, route, code);
  }

  /**
   * Get Ollama Version.
   * @returns Ollama Version.
   */
  async OllamaApiVersion(): Promise<string> {
    const route = this._RouteApiVersion;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      headers: this._headers,
      signal: this._signal,
    };
    const data = await fetch(url, req)
      .then((response) => response.json())
      .then((output): Types.OllamaApiVersionResponse => {
        return output as Types.OllamaApiVersionResponse;
      })
      .catch((err: FetchError) => {
        this._ErrorLogger(err);
        if (err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
        throw Errors.OllamaVersion;
      });

    return data.version;
  }

  /**
   * Get installed model.
   * @returns List of installed models.
   */
  async OllamaApiTags(): Promise<Types.OllamaApiTagsResponse> {
    const route = this._RouteApiTags;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      headers: this._headers,
      signal: this._signal,
    };
    const data = await fetch(url, req)
      .then(async (response) => {
        if (!response.ok) {
          const message = (await response.json()) as Types.OllamaErrorResponse;
          this._ErrorHandlerOllamaServer(route, response.status, message);
        }
        return response.json();
      })
      .then((output): Types.OllamaApiTagsResponse => {
        return output as Types.OllamaApiTagsResponse;
      })
      .catch((err: FetchError | Errors.OllamaServerError) => {
        this._ErrorLogger(err);
        if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
        throw err;
      });

    return data;
  }

  /**
   * Show model details.
   * @param model - Model name.
   * @returns Model details.
   */
  async OllamaApiShow(model: string): Promise<Types.OllamaApiShowResponse> {
    const route = this._RouteApiShow;
    const url = `${this._server}${route}`;
    const headers = { "Content-Type": "application/json", ...this._headers };
    const req: RequestInit = {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        name: model,
      }),
    };

    const data = await fetch(url, req)
      .then(async (response) => {
        if (!response.ok) {
          const message = (await response.json()) as Types.OllamaErrorResponse;
          this._ErrorHandlerOllamaServer(route, response.status, message, req, model);
        }
        return response.json();
      })
      .then((output): Types.OllamaApiShowResponse => {
        return output as Types.OllamaApiShowResponse;
      })
      .catch((err: FetchError | Error) => {
        this._ErrorLogger(err);
        if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
        throw err;
      });

    return data;
  }

  /**
   * Get `FROM` value from modelfile.
   * @param modelfile - Ollama Model Modelfile.
   * @returns `FROM` value.
   */
  private _OllamaApiShowParseModelfileFrom(modelfile: string): string {
    const o = modelfile.match(/^FROM[ ]+([a-zA-Z0-9:./]+)\n/m);
    if (o) return o[0];
    return "";
  }

  /**
   * Get `SYSTEM` value from modelfile.
   * @param modelfile - Ollama Model Modelfile.
   * @returns `SYSTEM` value.
   */
  private _OllamaApiShowParseModelfileSystem(modelfile: string): string | undefined {
    const i = modelfile.search(/^SYSTEM[  ]+(.*)/m);
    if (i !== -1) {
      return modelfile.substring(i).split('"""')?.[1];
    }
    return undefined;
  }

  /**
   * Get `LICENSE` value from modelfile.
   * @param modelfile - Ollama Model Modelfile.
   * @returns `LICENSE` value.
   */
  private _OllamaApiShowParseModelfileLicense(modelfile: string): string | undefined {
    const i = modelfile.search(/^LICENSE[  ]+(.*)/m);
    if (i !== -1) {
      return modelfile.substring(i).split('"""')?.[1];
    }
    return undefined;
  }

  /**
   * Split Parameters by new line.
   * @param parametrs - Ollama Model Parameters string.
   * @returns Array of Parameters.
   */
  private _OllamaApiShowParseModelfileParameterSplit(parameters: string | undefined): string[] {
    if (!parameters) return [];
    const o = parameters.split("\n");
    if (o) return o;
    return [];
  }

  /**
   * Get `mirostat` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `mirostat` Value.
   */
  private _OllamaApiShowParseModelfileParameterMirostat(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^mirostat[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^mirostat[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 0;
  }

  /**
   * Get `mirostat_eta` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `mirostat_eta` Value.
   */
  private _OllamaApiShowParseModelfileParameterMirostatEta(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^mirostat_eta[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^mirostat_eta[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 0.1;
  }

  /**
   * Get `mirostat_tau` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `mirostat_tau` Value.
   */
  private _OllamaApiShowParseModelfileParameterMirostatTau(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^mirostat_tau[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^mirostat_tau[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 5.0;
  }

  /**
   * Get `num_ctx` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `num_ctx` Value.
   */
  private _OllamaApiShowParseModelfileParameterNumCtx(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^num_ctx[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^num_ctx[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 2048;
  }

  /**
   * Get `num_gqa` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `num_gqa` Value.
   */
  private _OllamaApiShowParseModelfileParameterNumGqa(parameters: string[]): number | undefined {
    const o = parameters
      .filter((param) => param.search(/^num_gqa[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^num_gqa[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return undefined;
  }

  /**
   * Get `num_gpu` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `num_gpu` Value.
   */
  private _OllamaApiShowParseModelfileParameterNumGpu(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^num_gpu[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^num_gpu[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 1;
  }

  /**
   * Get `num_thread` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `num_thread` Value.
   */
  private _OllamaApiShowParseModelfileParameterNumThread(parameters: string[]): number | undefined {
    const o = parameters
      .filter((param) => param.search(/^num_thread[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^num_thread[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return undefined;
  }

  /**
   * Get `repeat_last_n` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `repeat_last_n` Value.
   */
  private _OllamaApiShowParseModelfileParameterRepeatLastN(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^repeat_last_n[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^repeat_last_n[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 64;
  }

  /**
   * Get `repeat_penalty` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `repeat_penalty` Value.
   */
  private _OllamaApiShowParseModelfileParameterRepeatPenalty(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^repeat_penalty[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^repeat_penalty[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 1.1;
  }

  /**
   * Get `temperature` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `temperature` Value.
   */
  private _OllamaApiShowParseModelfileParameterTemperature(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^temperature[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^temperature[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 0.8;
  }

  /**
   * Get `seed` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `seed` Value.
   */
  private _OllamaApiShowParseModelfileParameterSeed(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^seed[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^seed[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 0;
  }

  /**
   * Get `stop` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `stop` Value.
   */
  private _OllamaApiShowParseModelfileParameterStop(parameters: string[]): (string | undefined)[] {
    const o = parameters
      .filter((param) => param.search(/^stop[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^stop[  ]+(.*)/m)?.[1]);
    if (o) return o;
    return [];
  }

  /**
   * Get `tfs_z` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `tfs_z` Value.
   */
  private _OllamaApiShowParseModelfileParameterTfsZ(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^tfs_z[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^tfs_z[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 1;
  }

  /**
   * Get `num_predict` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `num_predict` Value.
   */
  private _OllamaApiShowParseModelfileParameterNumPredict(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^num_predict[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^num_predict[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 128;
  }

  /**
   * Get `top_k` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `top_k` Value.
   */
  private _OllamaApiShowParseModelfileParameterTopK(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^top_k[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^top_k[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 40;
  }

  /**
   * Get `top_p` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `top_p` Value.
   */
  private _OllamaApiShowParseModelfileParameterTopP(parameters: string[]): number {
    const o = parameters
      .filter((param) => param.search(/^top_p[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^top_p[  ]+(.*)/m)?.[1])?.[0];
    if (o) return Number(o);
    return 0.9;
  }

  /**
   * Get `ADAPTER` value from parameters array
   * @param parameters - Ollama Model Parameters string array.
   * @returns `ADAPTER` Value.
   */
  private _OllamaApiShowParseModelfileParameterAdapter(parameters: string[]): string | undefined {
    const o = parameters
      .filter((param) => param.search(/^ADAPTER[  ]+(.*)/m) !== -1)
      .map((param) => param.match(/^ADAPTER[  ]+(.*)/m)?.[1])?.[0];
    if (o) return o;
    return undefined;
  }

  /**
   * Return OllamaApiShowResponse Modelfile parameters.
   * @param show - Ollama Api Show Response.
   * @returns Modelfile parameters.
   */
  OllamaApiShowParseModelfile(show: Types.OllamaApiShowResponse): Types.OllamaApiShowModelfile {
    const parameters = this._OllamaApiShowParseModelfileParameterSplit(show.parameters);

    return {
      from: this._OllamaApiShowParseModelfileFrom(show.template),
      parameter: {
        mirostat: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterMirostat(parameters) : 0,
        mirostat_eta: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterMirostatEta(parameters) : 0.1,
        mirostat_tau: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterMirostatTau(parameters) : 5.0,
        num_ctx: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterNumCtx(parameters) : 2048,
        num_gqa: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterNumGqa(parameters) : undefined,
        num_gpu: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterNumGpu(parameters) : 1,
        num_thread: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterNumThread(parameters) : undefined,
        repeat_last_n: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterRepeatLastN(parameters) : 64,
        repeat_penalty:
          parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterRepeatPenalty(parameters) : 1.1,
        temperature: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterTemperature(parameters) : 0.8,
        seed: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterSeed(parameters) : 0,
        stop: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterStop(parameters) : [],
        tfs_z: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterTfsZ(parameters) : 1,
        num_predict: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterNumPredict(parameters) : 128,
        top_k: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterTopK(parameters) : 40,
        top_p: parameters.length > 0 ? this._OllamaApiShowParseModelfileParameterTopP(parameters) : 0.9,
      },
      template: show.template,
      system: this._OllamaApiShowParseModelfileSystem(show.template),
      adapter: this._OllamaApiShowParseModelfileParameterAdapter(parameters),
      license: this._OllamaApiShowParseModelfileLicense(show.template),
    };
  }

  /**
   * Delete model.
   * @param model - Model name.
   */
  async OllamaApiDelete(model: string): Promise<void> {
    const route = this._RouteApiDelete;
    const url = `${this._server}${route}`;
    const headers = { "Content-Type": "application/json", ...this._headers };
    const req: RequestInit = {
      method: "DELETE",
      headers: headers,
      body: JSON.stringify({
        model: model,
      }),
    };

    await fetch(url, req)
      .then(async (response) => {
        if (!response.ok) {
          const message = (await response.json()) as Types.OllamaErrorResponse;
          this._ErrorHandlerOllamaServer(route, response.status, message, req, model);
        }
      })
      .catch((err: FetchError | Error) => {
        this._ErrorLogger(err);
        if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
        throw err;
      });
  }

  /**
   * Pull model.
   * @param model - Model name.
   * @returns Response from the Ollama API with an EventEmitter with three event:
   *  - {string} `message` - Message from the Ollama API.
   *  - {string} `error` - Error from the Ollama API.
   *  - {number} `downloading` - Downloading percentage.
   *  - {string} `done` - On download completed.
   */
  async OllamaApiPull(model: string): Promise<EventEmitter> {
    const route = this._RouteApiPull;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify({
        name: model,
      }),
    };
    let emitter: EventEmitter | undefined;

    while (emitter === undefined) {
      emitter = await fetch(url, req)
        .then(async (response) => {
          if (!response.ok) {
            const message = (await response.json()) as Types.OllamaErrorResponse;
            this._ErrorHandlerOllamaServer(route, response.status, message, req, model);
          }
          return response.body;
        })
        .then((body) => {
          if (body === undefined) {
            return undefined;
          }

          const e = new EventEmitter();

          body?.on("data", (chunk) => {
            if (chunk !== undefined) {
              let json: Types.OllamaApiPullResponse | Types.OllamaErrorResponse | undefined;
              const buffer = Buffer.from(chunk);
              try {
                json = JSON.parse(buffer.toString());
              } catch (err) {
                console.error(err);
              }
              if (json)
                if ("total" in json && json.total && "completed" in json && json.completed) {
                  e.emit("downloading", json.completed / json.total);
                } else if ("status" in json && json.status === "success") {
                  e.emit("done", "Download completed");
                } else if ("error" in json) {
                  e.emit("error", json.error);
                } else {
                  e.emit("message", json.status);
                }
            }
          });

          return e;
        })
        .catch((err: FetchError | Error) => {
          this._ErrorLogger(err);
          if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
          throw err;
        });
    }
    return emitter;
  }

  /**
   * Perform text generation with the selected model.
   * @param body - Ollama Generate Body Request.
   * @returns Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
   */
  async OllamaApiGenerate(body: Types.OllamaApiGenerateRequestBody): Promise<EventEmitter> {
    const route = this._RouteApiGenerate;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify(body),
    };
    let emitter: EventEmitter | undefined;

    while (emitter === undefined) {
      emitter = await fetch(url, req)
        .then(async (response) => {
          if (!response.ok) {
            const message = (await response.json()) as Types.OllamaErrorResponse;
            this._ErrorHandlerOllamaServer(route, response.status, message, req, body.model);
          }
          return response.body;
        })
        .then((body) => {
          if (body === undefined) {
            return undefined;
          }

          const e = new EventEmitter();

          body?.on("data", (chunk) => {
            if (chunk !== undefined) {
              let json: Types.OllamaApiGenerateResponse | Types.OllamaErrorResponse | undefined;
              const buffer = Buffer.from(chunk);
              try {
                json = JSON.parse(buffer.toString());
              } catch (err) {
                console.error(err);
              }
              if (json)
                if ("done" in json) {
                  if (json.done) {
                    e.emit("done", json);
                  } else {
                    if ("response" in json && json.response) e.emit("data", json.response);
                  }
                } else if ("error" in json && json.error) {
                  e.emit("error", json);
                }
            }
          });

          return e;
        })
        .catch((err: FetchError | Error) => {
          this._ErrorLogger(err);
          if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
          throw err;
        });
    }
    return emitter;
  }

  /**
   * Perform conversation with the selected model.
   * @param body - Ollama Chat Body Request.
   * @returns Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiChatResponse` object contains all metadata of inference.
   */
  async OllamaApiChat(body: Types.OllamaApiChatRequestBody): Promise<EventEmitter> {
    const route = this._RouteApiChat;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify(body),
    };
    let emitter: EventEmitter | undefined;

    while (emitter === undefined) {
      emitter = await fetch(url, req)
        .then(async (response) => {
          if (!response.ok) {
            const message = (await response.json()) as Types.OllamaErrorResponse;
            this._ErrorHandlerOllamaServer(route, response.status, message, req, body.model);
          }
          return response.body;
        })
        .then((body) => {
          if (body === undefined) {
            return undefined;
          }

          const e = new EventEmitter();

          body?.on("data", (chunk) => {
            if (chunk !== undefined) {
              let json: Types.OllamaApiChatResponse | Types.OllamaErrorResponse | undefined;
              const buffer = Buffer.from(chunk);
              try {
                json = JSON.parse(buffer.toString());
              } catch (err) {
                console.error(err);
              }
              if (json)
                if ("done" in json) {
                  if (json.done) {
                    e.emit("done", json);
                  } else {
                    json.message && e.emit("data", json.message.content);
                  }
                } else if ("error" in json && json.error) {
                  e.emit("error", json);
                }
            }
          });

          return e;
        })
        .catch((err: FetchError | Error) => {
          this._ErrorLogger(err);
          if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
          throw err;
        });
    }
    return emitter;
  }

  /**
   * Perform text generation with the selected model without stream.
   * @param body - Ollama Generate Body Request.
   * @returns Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
   */
  async OllamaApiGenerateNoStream(body: Types.OllamaApiGenerateRequestBody): Promise<Types.OllamaApiGenerateResponse> {
    body.stream = false;
    const route = this._RouteApiGenerate;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify(body),
    };

    const response: Types.OllamaApiGenerateResponse | undefined = await fetch(url, req)
      .then(async (response) => {
        if (!response.ok) {
          const message = (await response.json()) as Types.OllamaErrorResponse;
          this._ErrorHandlerOllamaServer(route, response.status, message, req, body.model);
        }
        return response.json();
      })
      .then((json) => {
        return json as Types.OllamaApiGenerateResponse;
      })
      .catch((err: FetchError | Error) => {
        this._ErrorLogger(err);
        if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
        throw err;
      });

    return response;
  }

  /**
   * Perform text embeddings with the selected model.
   * @param prompt - text used for embeddings.
   * @param model - Model name.
   * @returns Ollama API embeddings response.
   */
  async OllamaApiEmbeddings(prompt: string, model: string): Promise<Types.OllamaApiEmbeddingsResponse> {
    const route = this._RouteApiEmbeddings;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify({
        model: model,
        prompt: prompt,
      }),
    };
    let embeddings: Types.OllamaApiEmbeddingsResponse | undefined;

    while (embeddings === undefined) {
      embeddings = await fetch(url, req)
        .then(async (response) => {
          if (!response.ok) {
            const message = (await response.json()) as Types.OllamaErrorResponse;
            this._ErrorHandlerOllamaServer(route, response.status, message, req, model);
          }
          return response.json();
        })
        .then(async (response) => {
          if (response === undefined) {
            return undefined;
          }
          return response as Types.OllamaApiEmbeddingsResponse;
        })
        .catch((err: FetchError | Error) => {
          this._ErrorLogger(err);
          if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
          throw err;
        });
    }
    return embeddings;
  }

  /**
   * Show loaded models
   * @return List of models loaded in ram
   */
  async OllamaApiPs(): Promise<Types.OllamaApiPsResponse> {
    const route = this._RouteApiPs;
    const url = `${this._server}${route}`;
    const req: RequestInit = {
      method: "GET",
      headers: this._headers,
    };
    let ps: Types.OllamaApiPsResponse | undefined;

    while (ps === undefined) {
      ps = await fetch(url, req)
        .then(async (response) => {
          if (!response.ok) {
            const message = (await response.json()) as Types.OllamaErrorResponse;
            this._ErrorHandlerOllamaServer(route, response.status, message, req);
          }
          return response.json();
        })
        .then(async (response) => {
          if (response === undefined) {
            return undefined;
          }
          return response as Types.OllamaApiPsResponse;
        })
        .catch((err: FetchError | Error) => {
          this._ErrorLogger(err);
          if (err instanceof FetchError && err.type === "ECONNREFUSED") throw Errors.OllamaNotInstalledOrRunning;
          throw err;
        });
    }
    return ps;
  }
}
