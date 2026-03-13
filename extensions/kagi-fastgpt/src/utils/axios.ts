import axios from "axios";
import { getPreferences } from "../interfaces/preferences";

const axiosClient = axios.create({
  baseURL: "https://kagi.com/api/v0",
  headers: {
    authorization: `Bot ${getPreferences().apiKey}`,
    "User-Agent": "Raycast FastGPT Extension",
  },
});

export default axiosClient;
