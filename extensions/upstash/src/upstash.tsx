import { Action, getPreferenceValues, Keyboard } from "@raycast/api";

const { email, api_key } = getPreferenceValues<Preferences>();
const TOKEN = Buffer.from(`${email}:${api_key}`).toString("base64");
export const API_URL = "https://api.upstash.com/v2/";
export const API_HEADERS = {
  Authorization: `Basic ${TOKEN}`,
};

async function callUpstash(endpoint: string, { method = "GET", body = {} } = {}) {
  const response = await fetch(API_URL + endpoint, {
    method,
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  // We have this custom parsing becaues in some cases Upstash returns a string value w/ Content-Type still as JSON causing JSON parse to fail.
  const text = await response.text();
  let result;
  try {
    result = await JSON.parse(text);
  } catch {
    result = text;
  }
  if (!response.ok) throw new Error(result || response.statusText);
  return result;
}
export async function getUpstash(endpoint: string) {
  return callUpstash(endpoint);
}
export async function postUpstash(endpoint: string, body: Record<string, string | number>) {
  return callUpstash(endpoint, {
    method: "POST",
    body,
  });
}
export async function deleteUpstash(endpoint: string) {
  return callUpstash(endpoint, {
    method: "DELETE",
  });
}

export function OpenInUpstash({ route }: { route: string }) {
  return (
    <Action.OpenInBrowser
      icon="upstash-icon-dark-bg.png"
      title="Open in Upstash"
      url={`https://console.upstash.com/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
