import axios, { AxiosRequestConfig } from "axios";
import { getOAuthToken } from "../components/withAsanaAuth";

async function getAxiosInstance() {
  return axios.create({
    baseURL: "https://app.asana.com/api/1.0",
    headers: {
      Authorization: `Bearer ${getOAuthToken()}`,
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
