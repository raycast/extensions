import fetch, { Response } from "node-fetch";
import { log } from "../util/log";
import { prefs } from "./preferences";
import { salesfoceClient } from "./login";

function apiUrl(path: string, queryParams?: { [key: string]: string }): string {
  const url = new URL(path, `https://${prefs.domain}.my.salesforce.com`).toString();
  const params = new URLSearchParams(queryParams).toString();
  return url + (params.length > 0 ? `?${params}` : "");
}

export async function get(urlPath: string, params?: { [key: string]: string }): Promise<Response> {
  const response = await fetch(apiUrl(urlPath, params), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${await salesfoceClient.accessToken()}`,
    },
  });
  if (response.status === 401) {
    await salesfoceClient.refreshToken();
    return get(urlPath, params);
  } else {
    return response;
  }
}

export async function failIfNotOk(response: Response, requestName?: string) {
  if (response.status >= 400) {
    try {
      log(`${requestName ?? ""}${response.status}: ${await response.text()}`);
      // eslint-disable-next-line no-empty
    } catch {}
    throw Error(`${requestName ?? "Request"} failed with status code ${response.status}`);
  }
}

export async function bodyOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
