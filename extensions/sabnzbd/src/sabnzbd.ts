import { getPreferenceValues } from "@raycast/api";
import { Client } from "sabnzbd-api";

const { url, apiToken } = getPreferenceValues<Preferences>();
export const client = new Client(url, apiToken);
