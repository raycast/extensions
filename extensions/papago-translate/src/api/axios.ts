import axios, { AxiosRequestConfig } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

const preferences = getPreferenceValues<Preferences>();

export const apiInstance = axios.create({
  baseURL: "https://openapi.naver.com/v1/papago",
  headers: {
    "X-Naver-Client-Id": preferences.clientId,
    "X-Naver-Client-Secret": preferences.clientSecret,
    "Content-Type": "application/x-www-form-urlencoded",
  },
});
