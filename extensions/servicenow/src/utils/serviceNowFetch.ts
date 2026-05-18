import { Instance } from "../types";
import { getAuthHeader, OnTokenRefresh } from "./auth";
import { getInstanceBaseUrl } from "./instanceUrl";

export class ServiceNowApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, message: string) {
    super(message);
    this.name = "ServiceNowApiError";
    this.status = status;
    this.body = body;
  }
}

export type ServiceNowFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  noAuth?: boolean;
  onRefresh?: OnTokenRefresh;
};

async function buildRequestInit(instance: Instance, options: ServiceNowFetchOptions | undefined): Promise<RequestInit> {
  const { noAuth, onRefresh, headers: extraHeaders, ...rest } = options ?? {};
  const headers: Record<string, string> = { ...extraHeaders };
  if (!noAuth && !headers["Authorization"]) {
    headers["Authorization"] = await getAuthHeader(instance, { onRefresh });
  }
  return { ...rest, headers };
}

function buildUrl(instance: Instance, path: string): string {
  return `${getInstanceBaseUrl(instance)}${path.startsWith("/") ? path : "/" + path}`;
}

export async function serviceNowFetchRaw(
  instance: Instance,
  path: string,
  options?: ServiceNowFetchOptions,
): Promise<Response> {
  const init = await buildRequestInit(instance, options);
  return fetch(buildUrl(instance, path), init);
}

export async function serviceNowFetch<T = unknown>(
  instance: Instance,
  path: string,
  options?: ServiceNowFetchOptions,
): Promise<T> {
  const response = await serviceNowFetchRaw(instance, path, {
    ...options,
    headers: { Accept: "application/json", ...(options?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new ServiceNowApiError(
      response.status,
      body,
      `Request failed (${response.status}): ${body || response.statusText}`,
    );
  }
  return (await response.json()) as T;
}
