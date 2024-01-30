import fetch from "node-fetch";
import { togglApiToken } from "../helpers/preferences";

const base64encode = (str: string) => {
  return Buffer.from(str).toString("base64");
};

const baseUrl = "https://api.track.toggl.com/api/v9";
const authHeader = { Authorization: `Basic ${base64encode(`${togglApiToken}:api_token`)}` };

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
