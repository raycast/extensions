import { getPreferenceValues } from "@raycast/api";
import Exa from "exa-js";

const preferences: ExtensionPreferences = getPreferenceValues();
const exa = new Exa(
  preferences.apiKey || "no-api-key",
  !preferences.apiKey ? "https://extensions-api-proxy.raycast.com/exa" : "https://api.exa.ai",
);

export default exa;
