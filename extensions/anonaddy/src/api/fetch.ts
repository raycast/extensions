import APIError from "./APIError";
import preferences from "../preferences";

type Init = { body?: Record<string, unknown> | null | undefined } & Omit<RequestInit, "body">;

const fetch = async (path: string, init: Init = {}): Promise<Response> => {
  const url = new URL(path, "https://app.addy.io/api/v1/");

  const response = await global.fetch(url.toString(), {
    ...init,
    body: JSON.stringify(init.body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) {
    throw new APIError(response);
  }

  return response;
};

export default fetch;
