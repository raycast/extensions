import type { RequestInit, Response } from "node-fetch";
import fetch, { FormData } from "node-fetch";

import { useFetch } from "@raycast/utils";
import type { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

import { APIError } from "./error";

export type RequestOptions = RequestInit & { accept?: string };

type APIErrorJSON = { code: string; message: string };

/**
 * Fetcher is a class that wraps the fetch API and adds the necessary headers
 */
export class Fetcher {
  #token: string;
  #apiUrl: string;
  #throwError: (error: Error) => void;

  /**
   * Create a new Fetcher
   *
   * @param token {string} A valid access token
   * @param apiUrl {string} The base URL of the API
   */
  constructor(token: string, apiUrl: string, throwError: (error: Error) => void) {
    this.#token = token;
    this.#throwError = throwError;

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
      const err = new APIError(json.code, json.message || "Api Error", xDenoRay);
      this.#throwError(err);
      throw err;
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
    return useFetch(url, { method, headers, body, keepPreviousData: opts.keepPreviousData, onError: this.#throwError });
  }
}
