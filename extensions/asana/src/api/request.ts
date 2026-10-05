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

type PaginatedResponse<T> = {
  data: T[];
  next_page: { offset: string; path: string; uri: string } | null;
};

export async function requestAll<T>(url: string, options?: AxiosRequestConfig) {
  const results: T[] = [];
  let offset: string | undefined;

  do {
    const { data } = await request<PaginatedResponse<T>>(url, {
      ...options,
      params: {
        limit: 100,
        ...options?.params,
        ...(offset ? { offset } : {}),
      },
    });

    results.push(...data.data);
    offset = data.next_page?.offset;
  } while (offset);

  return results;
}
