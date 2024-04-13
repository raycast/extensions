/* eslint-disable @typescript-eslint/no-explicit-any */

// This is a duplicated version of the Giphy Request, but it adds the AbortSignal to the request
// Original: https://github.com/Giphy/giphy-js/blob/master/packages/fetch-api/src/request.ts

import { FetchError, ErrorResult, Result } from "@giphy/js-fetch-api";
import fetch from "node-fetch";
import { AbortError } from "node-fetch";

export const ERROR_PREFIX = `@giphy/js-fetch-api: `;
export const DEFAULT_ERROR = "Error fetching";

export type RequestOptions = {
  apiVersion?: number;
  noCache?: boolean;
  normalizer?: (a: any) => any;
  signal?: AbortSignal;
};

const identity = (i: any) => i;
const requestMap: {
  [key: string]: {
    request: Promise<Result>;
    ts: number; // timestamp
    isError?: boolean;
  };
} = {};

const serverUrl = "https://api.giphy.com/v1/";

const maxLife = 60000; // clear memory cache every minute
const errorMaxLife = 6000; // clear error memory cache after a second

const purgeCache = () => {
  const now = Date.now();
  Object.keys(requestMap).forEach((key: string) => {
    const ttl = requestMap[key].isError ? errorMaxLife : maxLife;
    if (now - requestMap[key].ts >= ttl) {
      delete requestMap[key];
    }
  });
};

function request(url: string, options: RequestOptions = {}) {
  const { apiVersion = 1, noCache = false, normalizer = identity, signal } = options;
  const serverUrl_ = serverUrl.replace(/\/v\d+\/$/, `/v${apiVersion}/`);
  purgeCache();
  if (!requestMap[url] || noCache) {
    const fullUrl = `${serverUrl_}${url}`;
    const makeRequest = async (): Promise<Result> => {
      let fetchError: FetchError;
      try {
        const response = await fetch(fullUrl, {
          method: "get",
          signal,
        });
        if (response.ok) {
          const result = (await response.json()) as Result;
          // no response id is an indiication of a synthetic response
          if (!result.meta?.response_id) {
            throw { message: `synthetic response` } as ErrorResult;
          } else {
            // if everything is successful, we return here, otherwise an error will be thrown
            return normalizer(result);
          }
        } else {
          let message = DEFAULT_ERROR;
          try {
            // error results have a different format than regular results
            const result = (await response.json()) as ErrorResult;
            if (result.message) message = result.message;
            // eslint-disable-next-line no-empty
          } catch (_) {}
          if (requestMap[url]) {
            // we got a specific error,
            // normally, you'd want to not fetch this again,
            // but the api goes down and sends 400s, so allow a refetch after errorMaxLife
            requestMap[url].isError = true;
          }

          // we got an error response, throw with the message in the response body json
          fetchError = new FetchError(`${ERROR_PREFIX}${message}`, fullUrl, response.status, response.statusText);
        }
      } catch (unexpectedError: any) {
        fetchError = new FetchError(unexpectedError.message, fullUrl);
        if (!(unexpectedError instanceof AbortError)) {
          // if the request fails with an unspecfied error,
          // the user can request again after the error timeout
          if (requestMap[url]) {
            requestMap[url].isError = true;
          }
        }
      }
      if (fetchError.message !== "The operation was aborted.") {
        throw fetchError;
      } else {
        return {
          meta: {
            msg: "The operation was aborted.",
            status: 0,
            response_id: "",
          },
          pagination: {
            total_count: 0,
            count: 0,
            offset: 0,
          },
          data: [],
        } as Result;
      }
    };
    requestMap[url] = { request: makeRequest(), ts: Date.now() };
  }
  return requestMap[url].request;
}

export default request;
