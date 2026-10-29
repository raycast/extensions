import queryString from "query-string";

import { getPreferences } from "../preferences";

const { token } = getPreferences();

const options = {
  method: "get",
  headers: {
    Authorization: `Token ${token}`,
  },
};

export const fetchReadwise = async <Result, Params extends object>(url: string, params: Params): Promise<Result> => {
  const requestUrl = `https://readwise.io/api${url}?${queryString.stringify(params)}`;
  let response = await fetch(requestUrl, options);
  let retries = 0;
  let waitedMs = 0;

  while (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const seconds = retryAfter?.trim() ? Number(retryAfter) : NaN;
    const delayMs = Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds * 1000) : 3000;
    await response.body?.cancel();

    // Honor Readwise's delay without making an AI tool wait indefinitely.
    if (retries >= 2 || waitedMs + delayMs > 60000) {
      throw Object.assign(
        new Error(
          `Readwise rate limit reached. Please try again in ${delayMs / 1000} second${delayMs === 1000 ? "" : "s"}.`
        ),
        {
          status: 429,
        }
      );
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    waitedMs += delayMs;
    retries += 1;
    response = await fetch(requestUrl, options);
  }

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
