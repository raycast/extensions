import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { LocalStorage } from "@raycast/api";
import { Stats } from "../types/stats";
import { API_BASE_URL, STATS_ENDPOINT, TICKET_RESULT_ENDPOINT } from "../enum";
import { drawingResult } from "../types/winner_result";

const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-type": "application/json" },
});
const KEY_STATS_STORAGE = "stats";
const responseBody = (response: AxiosResponse) => response.data;
const requests = {
  get: (url: string, config: AxiosRequestConfig = {}) => instance.get(url, config).then(responseBody),
  post: (url: string, data: any) => instance.post(url, data).then(responseBody),
};

export const getStats = {
  loadData: (): Promise<Stats> =>
    requests
      .get(STATS_ENDPOINT)
      .then((data) => {
        LocalStorage.setItem(KEY_STATS_STORAGE, JSON.stringify(data));
        return data;
      })
      .catch(() => {
        LocalStorage.getItem<string>(KEY_STATS_STORAGE).then((data) => {
          // output cached data
          if (data == undefined || data.length < 1) return [];
          return data;
        });
      }),
};

export const getAddressResult = {
  loadData: (address: string): Promise<drawingResult> =>
    requests
      .post(TICKET_RESULT_ENDPOINT, { address: address })
      .then((data) => {
        return data;
      })
      .catch(() => {
        return null;
      }),
};
