import { API_KEY, API_PASS } from "../config";
import { Panel } from "../types/panel";
import generateBaseUrl from "./generate-base-url";

export default function generateAPIUrl(act: string, params: { [key: string]: string }, panel?: Panel) {
  const BASE_URL = generateBaseUrl(panel?.virtualizor_url);
  const API_URL = BASE_URL + "index.php?";
  const API_PARAMS = new URLSearchParams({
    act,
    api: "json",
    apikey: panel?.api_key || API_KEY,
    apipass: panel?.api_pass || API_PASS,
    ...params,
  });
  return API_URL + API_PARAMS.toString();
}
