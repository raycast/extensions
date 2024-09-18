import nodeFetch, { RequestInit, Response } from "node-fetch";

import preferences from "../preferences";

const fetch = async (pathname: string, init: RequestInit = {}): Promise<Response> => {
  const response = await nodeFetch(`https://app.addy.io/api/v1/${pathname.replace(/^\//, "")}`, {
    ...init,
    headers: {
      ...init?.headers,
      Accept: "application/json",
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (response.status === 401) {
    throw new Error("Addy API credentials are invalid");
  }

  return response;
};

export default fetch;
