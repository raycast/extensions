import { PasteClient } from "pastebin-api";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

const client = new PasteClient(preferences.apiKey);

export default client;
