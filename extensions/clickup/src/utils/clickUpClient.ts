import axios, { AxiosRequestHeaders, AxiosResponse } from "axios";
import preferences from "./preferences";

axios.defaults.baseURL = "https://api.clickup.com/api";
axios.defaults.headers.common["Authorization"] = preferences.token;
axios.defaults.headers.post["Content-Type"] = "application/json; charset=utf-8";
axios.defaults.headers.get["Content-Type"] = "application/json; charset=utf-8";

async function ClickUpClient<T>(
  endpoint: string,
  method?: string,
  data?: Record<string, string | number>,
  headers?: AxiosRequestHeaders,
  version?: 2 | 3,
): Promise<AxiosResponse<T>> {
  const v = version === 3 ? `v3` : `v2`;
  switch (method) {
    case "POST":
      return await axios.post<T>(`${v}${endpoint}`, data, { headers });
    default:
      return await axios.get<T>(`${v}${endpoint}`, headers);
  }
}

export { ClickUpClient };
