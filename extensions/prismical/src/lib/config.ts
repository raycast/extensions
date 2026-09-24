import { getPreferenceValues } from "@raycast/api";
import { Api } from "./api";
export const API_ORIGIN = "https://api.prismical.ai";
export const WEB_ORIGIN = "https://app.prismical.ai";
export const settings = () => getPreferenceValues<Preferences>();
export function client() {
  return new Api(API_ORIGIN, settings().apiKey);
}
export function noteUrl(id: string) {
  return `${WEB_ORIGIN}/notes/${encodeURIComponent(id)}`;
}
