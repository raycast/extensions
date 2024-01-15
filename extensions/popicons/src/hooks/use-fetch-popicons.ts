import { useFetch } from "@raycast/utils";
import { z } from "zod";

import { FetchPopiconsErrorReason } from "../enums/fetch-popicons-error-reason";
import { FetchPopiconsError } from "../errors/fetch-popicons-error";
import { Popicon } from "../schemas/popicon";
import { UseFetchOptions } from "../types/use-fetch-options";
import { Prettify } from "../utilities/types/prettify";

import { attempt } from "../utilities/attempt";
import { raise } from "../utilities/raise";

const API_URL = "https://popicons.up.railway.app/v1/web/icons";

async function parsePopIconsApiResponse(response: Response): Promise<Array<Popicon>> {
  if (!response.ok) {
    throw new FetchPopiconsError(FetchPopiconsErrorReason.ResponseNotOk);
  }

  const json = await attempt(async () => (await response.json()) as Promise<unknown>)
    .fallback(() => raise(new FetchPopiconsError(FetchPopiconsErrorReason.InvalidJson)))
    .run();

  const icons = attempt(() => z.array(Popicon).parse(json))
    .fallback(() => raise(new FetchPopiconsError(FetchPopiconsErrorReason.FailedValidation)))
    .run();

  return icons;
}

type UseFetchPopiconsOptions = Prettify<UseFetchOptions<Array<Popicon>>>;

/**
 * Fetches the latest Popicons from the Popicons API.
 */
function useFetchPopIcons(options?: UseFetchPopiconsOptions) {
  const { isLoading, revalidate, data, error } = useFetch<Array<Popicon>>(API_URL, {
    ...options,
    parseResponse: parsePopIconsApiResponse,
  });

  return {
    icons: data,
    revalidate,
    error,
    isLoading,
  };
}

export { useFetchPopIcons };
