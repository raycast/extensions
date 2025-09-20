import { getPreferenceValues } from "@raycast/api";
import { Creem } from "creem";

const { mode, api_key, test_api_key } = getPreferenceValues<Preferences>();
export const creem = new Creem({ serverIdx: mode === "production" ? 0 : 1 });
export const API_KEY = mode === "production" ? api_key : test_api_key;
