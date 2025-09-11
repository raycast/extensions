import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { API_CONFIG } from "../config";
import { getPreferenceValues } from "@raycast/api";
import { SomeFunction } from "./types";

// Create axios instance with base config
export const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add API key
apiClient.interceptors.request.use((requestConfig) => {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.apiKey;

    if (apiKey) {
      requestConfig.headers["x-auth-token"] = apiKey;
    }
  } catch (error) {
    // Handle case when preferences are not available (shouldn't happen in normal usage)
    console.warn("Could not get API key from preferences:", error);
  }

  return requestConfig;
});

export const extractSignal = (signal?: AbortSignal | AbortController | undefined) => {
  if (signal && typeof signal === "object" && "signal" in signal) {
    return signal.signal;
  }
  return signal;
};

const getConfigFromParams = (
  options?: AxiosRequestConfig,
  controller?: AbortController | AbortSignal,
): AxiosRequestConfig => {
  return { ...(options ?? {}), signal: options?.signal ?? extractSignal(controller) };
};

export const createRouter = <T extends { [key: string]: SomeFunction<any, any> }>(data: T): T => {
  return data;
};

export const combineRouters = <T extends { [key: string]: SomeFunction<any, any> }, R extends { [key: string]: T }>(
  routes: R,
): R => {
  return routes;
};

export async function createInstanceGateway<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
  controller?: AbortController | AbortSignal,
): Promise<T> {
  const opts = getConfigFromParams(options, controller);
  const result = (await apiClient({ ...opts, ...config })) as AxiosResponse<T>;
  return result.data;
}
