import { Color, getPreferenceValues } from "@raycast/api";
import { State } from "./types";

const { api_key, postiz_url } = getPreferenceValues<Preferences>();
export const buildPostizUrl = (endpoint: string, params: Record<string, number | string> = {}) => {
  try {
    const url = new URL(postiz_url);
    url.pathname = url.host === "api.postiz.com" ? "public/v1" : "api/public/v1";
    url.pathname += `/${endpoint}`;
    Object.entries(params).forEach(([key, val]) => url.searchParams.append(key, String(val)));
    return url.toString();
  } catch {
    return "";
  }
};
export const POSTIZ_HEADERS = {
  Accept: "application/json",
  Authorization: api_key,
  "Content-Type": "application/json",
};
export const parsePostizResponse = async (response: Response) => {
  if (!response.headers.get("content-type")?.includes("json")) throw new Error(response.statusText);
  const result = await response.json();
  if (!response.ok) {
    const err = result as { error?: string; message: string[] | string };
    let message = err.error ? `${err.error} | ` : "";
    message += Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(message);
  }
  return result;
};

export const STATE_COLORS: Record<State, Color> = {
  QUEUE: Color.Blue,
  PUBLISHED: Color.Green,
  ERROR: Color.Red,
  DRAFT: Color.Yellow,
};
