import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { ErrorResult } from "./types";

const { seafile_url, username, password } = getPreferenceValues<Preferences>();
export let SEAFILE_URL = "";
let API_URL = "";
const API_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
};

const parseResponse = async <T>(response: Response) => {
  const result = await response.json();
  if (!response.ok) {
    const error = result as ErrorResult;
    if ("detail" in error) throw new Error(error.detail as string);
    if ("error_msg" in error) throw new Error(error.error_msg as string);
    throw new Error(`${Object.keys(error)[0]}: ${error[Object.keys(error)[0]]}`);
  }
  return result as T;
};

const getToken = async () => {
  if (!SEAFILE_URL) {
    const url = new URL(seafile_url).toString();
    SEAFILE_URL = url.endsWith("/") ? url : `${url}/`;
  }
  if (!API_URL) API_URL = SEAFILE_URL + "api2/";
  const token = await LocalStorage.getItem<string>("SEAFILE-ACCOUNT-TOKEN");
  if (token) return token;
  const response = await fetch(API_URL + "auth-token/", {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ username, password }),
  });
  const result = await parseResponse<{ token: string }>(response);
  const newToken = result.token;
  await LocalStorage.setItem("SEAFILE-ACCOUNT-TOKEN", newToken);
  return newToken;
};

export const makeRequest = async <T>(endpoint: string) => {
  try {
    const token = await getToken();
    const response = await fetch(API_URL + endpoint, {
      headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
    });
    const result = await parseResponse<T>(response);
    return result;
  } catch (error) {
    const err = error as Error;
    if (err.message === "Invalid token") await LocalStorage.removeItem("SEAFILE-ACCOUNT-TOKEN");
    throw new Error(err.message);
  }
};
