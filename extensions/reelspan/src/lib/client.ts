import { getPreferenceValues } from "@raycast/api";
import { makeClient } from "./reelspan";

export const prefs = () => getPreferenceValues<Preferences>();
export const client = () => makeClient(prefs().apiKey);
