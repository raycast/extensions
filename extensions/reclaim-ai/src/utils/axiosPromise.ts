import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { NativePreferences } from "../types/preferences";

type ApiBadRequestException = { message: string; code: number };

export async function axiosPromiseData<T>(
  promise: Promise<AxiosResponse<T>>
): Promise<[AxiosResponse<T>["data"], null] | [null, ApiBadRequestException | undefined]> {
  try {
    const result: Awaited<AxiosResponse<T>> = await promise;
    return [result.data, null];
  } catch (err) {
    return [null, (err as AxiosError<ApiBadRequestException>).response?.data];
  }
}

export async function axiosPromiseStatusCode<T>(
  promise: Promise<AxiosResponse<T>>
): Promise<[AxiosResponse<T>["status"], null] | [null, ApiBadRequestException | undefined]> {
  try {
    const result: Awaited<AxiosResponse<T>> = await promise;
    return [result.status, null];
  } catch (err) {
    return [null, (err as AxiosError<ApiBadRequestException>).response?.data];
  }
}

const { apiToken, apiUrl } = getPreferenceValues<NativePreferences>();

export const fetcher = async <T>(url: string, options?: AxiosRequestConfig) => {
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  return await axios<T>(url, {
    ...options,
    baseURL: apiUrl,
    headers,
    timeout: 20000,
  });
};
