import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface Preferences {
  "api-key": string;
}

const axiosClient = axios.create({
  headers: {
    Authorization: `Bearer ${getPreferenceValues<Preferences>()["api-key"]}`,
  },
  baseURL: "https://api.controld.com",
});

export default axiosClient;
