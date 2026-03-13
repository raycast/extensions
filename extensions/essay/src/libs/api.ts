import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues<Preferences>();

const api = axios.create({
  baseURL: "https://api.essay.ink",
  timeout: 60 * 1000, // 60 seconds
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${preferences.apiKey}`,
  },
});

export default api;
