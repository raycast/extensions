import type { RequestInit, Response } from "node-fetch";
import fetch, { FormData } from "node-fetch";

import { useFetch } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export type RequestOptions = RequestInit & {
  accept?: string;
};

export class APIError extends Error {
  code: string;
  xDenoRay: string | null;

  name = "APIError";

  constructor(code: string, message: string, xDenoRay: string | null) {
    super(message);
    this.code = code;
    this.xDenoRay = xDenoRay;
  }

  toString() {
    let error = `${this.name}: ${this.message}`;
    if (this.xDenoRay !== null) {
      error += `\n\nx-deno-ray: ${this.xDenoRay}`;
      error +=
        "\n\nIf you encounter this error frequently," + " contact us at deploy@deno.com with the above x-deno-ray.";
    }
    return error;
  }
}

type APIErrorJSON = {
  code: string;
  message: string;
};

/**
 * Fetcher is a class that wraps the fetch API and adds the necessary headers
 */
export class Fetcher {
  #token: string;
  #apiUrl: string;

  /**
   * Create a new Fetcher
   *
   * @param token {string} A valid access token
   * @param apiUrl {string} The base URL of the API
   */
  constructor(token: string, apiUrl: string) {
    this.#token = token;

    if (apiUrl.endsWith("/")) {
      apiUrl = apiUrl.slice(0, -1);
    }

    this.#apiUrl = apiUrl;
  }

  async request(path: string, opts: RequestOptions = {}): Promise<Response> {
    const url = `${this.#apiUrl}${path}`;
    const method = opts.method ?? "GET";
    const body =
      opts.body !== undefined
        ? opts.body instanceof FormData
          ? opts.body
          : typeof opts.body === "string"
            ? opts.body
            : JSON.stringify(opts.body)
        : undefined;
    const authorization = `Bearer ${this.#token}`;
    const headers = {
      Accept: opts.accept ?? "application/json",
      Authorization: authorization,
      ...(opts.body !== undefined ? (opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }) : {}),
    };
    const res = await fetch(url, { method, headers, body });
    if (res.status !== 200) {
      const json = (await res.json()) as APIErrorJSON;
      const xDenoRay = res.headers.get("x-deno-ray");
      throw new APIError(json.code, json.message, xDenoRay);
    }
    return res;
  }

  async requestJSON<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.request(path, opts);
    return res.json() as Promise<T>;
  }

  useFetch<T, U>(
    path: string,
    opts: RequestOptions & { keepPreviousData?: boolean } = {},
  ): UseCachedPromiseReturnType<T | (undefined & U), T | U> {
    const url = `${this.#apiUrl}${path}`;
    const method = opts.method ?? "GET";
    const body =
      opts.body !== undefined
        ? opts.body instanceof FormData
          ? opts.body
          : typeof opts.body === "string"
            ? opts.body
            : JSON.stringify(opts.body)
        : undefined;
    const authorization = `Bearer ${this.#token}`;
    const headers = {
      Accept: opts.accept ?? "application/json",
      Authorization: authorization,
      ...(opts.body !== undefined ? (opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }) : {}),
    };
    return useFetch(url, { method, headers, body, keepPreviousData: opts.keepPreviousData });
  }
}
