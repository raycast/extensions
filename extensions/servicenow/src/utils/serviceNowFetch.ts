import { Instance } from "../types";
import { getAuthHeader, OnTokenRefresh } from "./auth";
import { getInstanceBaseUrl } from "./instanceUrl";

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
