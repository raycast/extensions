import { getPreferenceValues } from "@raycast/api";
import { makeClient } from "./reelspan";

export type Prefs = { apiKey: string; defaultProfile?: string };

export const prefs = () => getPreferenceValues<Prefs>();
export const client = () => makeClient(prefs().apiKey);
