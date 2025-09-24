import { getPreferenceValues } from "@raycast/api";
import { Autumn } from "autumn-js";

const { api_key, sandbox_api_key, use_sandbox } = getPreferenceValues<Preferences>();

export const AUTUMN_LIMIT = 20;
// we set logLevel otherwise errors are console.log by default
export const autumn = new Autumn({ secretKey: use_sandbox ? sandbox_api_key : api_key, logLevel: "fatal" });
