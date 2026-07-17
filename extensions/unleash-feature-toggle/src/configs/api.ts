import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosError } from "axios";
import { TError } from "../types";

const preferences = getPreferenceValues<Preferences>();

const api = axios.create({
  baseURL: preferences.api,
});

api.interceptors.request.use((config) => {
  const token = preferences.token;

  config.headers.Authorization = token;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<TError>) => {
    const errResponse = {
      ...err?.response?.data,
      code: err.response?.status,
    };

    return Promise.reject(errResponse);
  },
);

export default api;
