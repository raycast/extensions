import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  token: string;
}

function getToken() {
  const { token } = getPreferenceValues<Preferences>();
  return token;
}

function getHeaders(token: string) {
  const headers = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };
  return headers;
}

export function useDefaultHeaders() {
  return getHeaders(getToken());
}
