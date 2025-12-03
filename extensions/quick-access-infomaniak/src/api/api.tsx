import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const { personalAccessToken } = getPreferenceValues<Preferences>();

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
