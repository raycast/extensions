import { API_KEY, API_PASS } from "../config";
import generateBaseUrl from "./generate-base-url";

export default function generateAPIUrl(act: string, params: { [key: string]: string }) {
  const BASE_URL = generateBaseUrl();
  const API_URL = BASE_URL + "index.php?";
  const API_PARAMS = new URLSearchParams({
    act,
    api: "json",
    apikey: API_KEY,
    apipass: API_PASS,
    ...params,
  });
  return API_URL + API_PARAMS.toString();
}
