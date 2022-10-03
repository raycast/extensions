import axios, { AxiosRequestConfig } from "axios";
import { client } from "./oauth";

async function getAxiosInstance() {
  const tokenSet = await client.getTokens();

  return axios.create({
    baseURL: "https://app.asana.com/api/1.0",
    headers: {
      Authorization: `Bearer ${tokenSet?.accessToken}`,
    },
  });
}

export async function request<T>(url: string, options?: AxiosRequestConfig) {
  const axios = await getAxiosInstance();

  return axios.request<T>({
    url,
    ...options,
  });
}
