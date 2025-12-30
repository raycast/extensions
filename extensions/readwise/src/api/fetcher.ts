import fetch from "node-fetch";
import queryString from "query-string";

import { getPreferences } from "../preferences";

const { token } = getPreferences();

const options = {
  method: "get",
  headers: {
    Authorization: `Token ${token}`,
  },
};

export const fetchReadwise = async <Result, Params extends Record<string, any>>(
  url: string,
  params: Params
): Promise<Result> => {
  const response = await fetch(`https://readwise.io/api${url}?${queryString.stringify(params)}`, options);

  const json = (await response.json()) as Result;

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.");
    // inspired by https://swr.vercel.app/docs/error-handling
    // Attach extra info to the error object.
    // @ts-expect-error extend Error type
    error.status = response.status;
    throw error;
  }

  return json;
};
