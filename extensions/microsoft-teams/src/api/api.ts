import fetch, { Response } from "node-fetch";
import { graphClient } from "./login";
import { URLSearchParams } from "url";

type QueryParams = { [key: string]: string };
const baseUrl = "https://graph.microsoft.com/";
const apiVersionDefault = "v1.0";

interface Request {
  path: string;
  apiVersion?: typeof apiVersionDefault | "beta";
  queryParams?: QueryParams;
  body?: Record<string, unknown>;
}

function apiUrl(request: Request): string {
  const params = new URLSearchParams(request.queryParams).toString();
  const apiBaseUrl = baseUrl + (request.apiVersion ?? apiVersionDefault);
  return apiBaseUrl + request.path + (params.length > 0 ? `?${params}` : "");
}

export async function apiRequest(method: string, options: Request): Promise<Response> {
  const url = apiUrl(options);
  console.log(`${method} ${url}`);
  console.log(options);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await graphClient.accessToken()}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  console.log(response.status);
  if (response.status === 401) {
    await graphClient.refreshToken();
    return apiRequest(method, options);
  } else {
    return response;
  }
}

export const get = async (options: Request) => apiRequest("GET", options);
export const post = async (options: Request) => apiRequest("POST", options);

export async function failIfNotOk(response: Response, requestName?: string) {
  if (response.status >= 400) {
    try {
      console.log(`${requestName ?? ""}${response.status}: ${await response.text()}`);
      // eslint-disable-next-line no-empty
    } catch {}
    throw Error(`${requestName ?? "Request"} failed with status code ${response.status}`);
  }
}

export async function bodyOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
