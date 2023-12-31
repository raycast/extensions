import axios from "axios";
import { showFailureToast } from "@raycast/utils";

export function getBaseURL(override: boolean = true) {
  const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:8000" : "https://rootnote.io";

  if (override === true) {
    return "https://rootnote.io";
  }

  return baseUrl;
}

export function configureAxios(apiKey: string) {
  axios.defaults.baseURL = getBaseURL();

  if (apiKey) {
    axios.defaults.headers.common["Authorization"] = `Token ${apiKey}`;
  } else {
    showFailureToast("API key is not set in preferences.");
  }
}
