import axios from "axios";
import { API_URL, getHeaders } from "./config";
import { Clipboard, getPreferenceValues, showHUD, open } from "@raycast/api";

interface Preferences {
  api_key: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const headers = getHeaders(preferences.api_key);

  axios.defaults.baseURL = API_URL;
  axios.defaults.headers.common["Authorization"] = headers.Authorization;

  await axios
    .post("/email/create")
    .then((response) => {
      if (response.data.email) {
        Clipboard.copy(response.data.email);
        showHUD("Copied email to clipboard!");
      }
      if (response.data.message) {
        showHUD(response.data.message);
        open("https://hidemail.app/dashboard");
      }
    })
    .catch((reason) => {
      showHUD("Failed to generate and copy to clipboard - " + reason);
    });
}
