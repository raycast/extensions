import axios, { AxiosRequestConfig } from "axios";
import { getPreferenceValues } from "@raycast/api";

function getApiKey(): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  return apiKey;
}

const client = axios.create({
  baseURL: "https://api.everhour.com",
});

client.interceptors.request.use((config) => {
  config.headers["X-Api-Key"] = getApiKey();
  return config;
});

export async function request<T>(url: string, options?: AxiosRequestConfig) {
  return client.request<T>({ url, ...options });
}
