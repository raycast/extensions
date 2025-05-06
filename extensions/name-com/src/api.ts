import { getPreferenceValues } from "@raycast/api";

const { username, token, dev_token, use_prod } = getPreferenceValues<Preferences>();
const USER = use_prod ? username : `${username}-test`;
const PASS = use_prod ? token : dev_token;

export const API_URL = use_prod ? "https://api.name.com/v4/" : "https://api.dev.name.com/v4/";
export const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Basic ${btoa(`${USER}:${PASS}`)}`,
};

export const parseResponse = async (response: Response) => {
  const text = await response.text();
  const json = await JSON.parse(text);
  if (!response.ok) {
    const error = json as { message: string; details?: string };
    throw new Error(error.message, { cause: error.details });
  }
  return json;
};
