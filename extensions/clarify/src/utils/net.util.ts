import { getAccessToken } from "@raycast/utils";

export function getHeaders() {
  const { token } = getAccessToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export function getRequestConfig() {
  return {
    headers: getHeaders(),
  };
}
