import fetch from "node-fetch";
import { wiseReadApiToken } from "../helpers/preferences";

export const baseUrl = "https://api.transferwise.com/";
const authHeader = { Authorization: `Bearer ${wiseReadApiToken}` };

export const get = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(baseUrl + endpoint, {
    headers: authHeader,
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
};
export const post = async <T>(endpoint: string, body: unknown): Promise<T> => {
  const response = await fetch(baseUrl + endpoint, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}, ${await response.text()}`);
  }
  return (await response.json()) as T;
};

export const patch = async <T>(endpoint: string, body: unknown): Promise<T> => {
  const response = await fetch(baseUrl + endpoint, {
    method: "PATCH",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}, ${await response.text()}`);
  }
  return (await response.json()) as T;
};
