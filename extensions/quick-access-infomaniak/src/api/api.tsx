import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const { personalAccessToken } = getPreferenceValues<Preferences>();

if (!personalAccessToken) {
  console.error("Personal Access Token missing");
}

const API = axios.create({
  baseURL: "https://api.infomaniak.com",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + personalAccessToken,
  },
  withCredentials: false,
});

export default API;
