import fetch, { Headers, Response } from "node-fetch";

import { SUPERNOTES_API_ROOT } from "~/utils/defines";
import { IntegratedError, UnifiedError } from "~/utils/types";

import { paths } from "./schema";

const httpMethods = ["get", "put", "post", "delete", "patch"] as const;
type HttpMethod = (typeof httpMethods)[number];

type FilterKeys<Obj, Matchers> = {
  [K in keyof Obj]: K extends Matchers ? Obj[K] : never;
}[keyof Obj];

type OkStatus = 200 | 201 | 202 | 203 | 204 | 206 | 207;
type JSONLike = `${string}json${string}`;

interface BaseParams {
  header?: never;
}

type SuccessContent<O> = FilterKeys<FilterKeys<FilterKeys<O, OkStatus>, "content">, JSONLike>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RequestBodyObj<O> = O extends { requestBody?: any } ? O["requestBody"] : never;
type RequestBodyContent<O> =
  undefined extends RequestBodyObj<O>
    ? FilterKeys<NonNullable<RequestBodyObj<O>>, "content"> | undefined
    : FilterKeys<RequestBodyObj<O>, "content">;
type RequestBodyJSON<O> =
  FilterKeys<RequestBodyContent<O>, JSONLike> extends never
    ? FilterKeys<NonNullable<RequestBodyContent<O>>, JSONLike> | undefined
    : FilterKeys<RequestBodyContent<O>, JSONLike>;

type StandardOptions = { apiKey: string; signal?: AbortSignal };
type RequestParams<PM> = StandardOptions &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PM extends { parameters: any } ? NonNullable<PM["parameters"]> : BaseParams);
type ApiPathObject<PM> = FilterKeys<RequestParams<PM>, "path">;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponseData<O> = O extends { responses: any } ? SuccessContent<O["responses"]> : null;

export type ApiRequestOptions<PM> =
  undefined extends RequestBodyJSON<PM>
    ? RequestParams<PM>
    : RequestParams<PM> & { body: RequestBodyJSON<PM> };

interface FetchGoodResult<PM> {
  ok: true;
  body: ApiResponseData<PM>;
  response: Response;
}

interface FetchBadResult {
  ok: false;
  body: IntegratedError;
  response: null | Response;
}

export type FetchResult<PM> = FetchGoodResult<PM> | FetchBadResult;

const methodSet = new Set<unknown>(httpMethods);
export function isHttpMethod(method: string | number | symbol): method is HttpMethod {
  return methodSet.has(method);
}

export function injectPath<P extends keyof paths, M extends keyof paths[P]>(
  url: P,
  _: M,
  path?: ApiPathObject<paths[P][M]>,
) {
  let finalUrl = url as string;
  if (path) {
    for (const [k, v] of Object.entries(path)) {
      finalUrl = finalUrl.replace(`{${k}}`, encodeURIComponent(String(v)));
    }
  }
  return finalUrl;
}

export const superfetch = async <P extends keyof paths, M extends keyof paths[P] & HttpMethod>(
  url: P,
  method: M,
  options: ApiRequestOptions<paths[P][M]>,
): Promise<FetchResult<paths[P][M]>> => {
  // this runtime check is a bit pointless, but it makes the typing a bit safer and easier
  if (!isHttpMethod(method)) throw new TypeError(`[COURIER] Invalid fetch method: ${method}`);
  const { path, query, body } = options;
  let processedUrl = injectPath(url, method, path);
  // remove any undefined query params
  if (query instanceof Object) {
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined) delete query[key];
    }
    processedUrl += `?${new URLSearchParams(query).toString()}`;
  }
  try {
    const response = await fetch(`${SUPERNOTES_API_ROOT}${processedUrl}`, {
      redirect: "follow",
      headers: new Headers({ "Content-Type": "application/json", "Api-Key": options.apiKey }),
      method: method.toUpperCase(),
      body: JSON.stringify(body),
    });
    if (response.status >= 500) {
      return {
        ok: false as const,
        body: {
          type: "connection",
          status: null,
          detail: "Internal Server Error",
        } as IntegratedError,
        response,
      };
    }
    const responseJson = await response.json();
    return response.ok
      ? {
          ok: true,
          body: responseJson as ApiResponseData<paths[P][M]>,
          response,
        }
      : {
          ok: false,
          body: responseJson as UnifiedError,
          response,
        };
  } catch (exc) {
    return {
      ok: false as const,
      body: {
        type: "connection",
        status: null,
        detail: exc instanceof Error ? exc.message : "whoops",
        meta: exc instanceof Error && exc.name === "AbortError" ? "abort" : "timeout",
      } as IntegratedError,
      response: null,
    };
  }
};
