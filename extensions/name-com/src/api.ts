import { getPreferenceValues } from "@raycast/api";

const { username, token, dev_token, use_prod } = getPreferenceValues<Preferences>();
const USER = use_prod ? username : `${username}-test`;
const PASS = use_prod ? token : dev_token;

export const API_URL = use_prod ? "https://api.name.com/core/v1/" : "https://api.dev.name.com/core/v1/";
export const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}`,
};

export const parseResponse = async (response: Response) => {
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) {
    const error = result as { message: string; details?: string };
    throw new Error(error.message, { cause: error.details });
  }
  return result;
};

export const callCoreApi = async <T>(
  endpoint: string,
  { method, body }: { method: string; body?: Record<string, string> } = { method: "GET" },
) => {
  const response = await fetch(API_URL + endpoint, {
    method,
    headers,
    body: body && JSON.stringify(body),
  });
  const result = await parseResponse(response);
  return result as T;
};
