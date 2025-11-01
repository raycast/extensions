import { getPreferenceValues } from "@raycast/api";
import axios, { AxiosError } from "axios";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as R from "fp-ts/Reader";
import * as TE from "fp-ts/TaskEither";
import { Errors } from "io-ts";
import {
  ISearchResponse,
  ISearchResult,
  IStatusResponse,
  SearchResponse,
  SearchResultWithStatus,
  Status,
  StatusResponse,
} from "./types";
import { setupCache } from "axios-cache-adapter";

type RaycastPreferences = {
  rapidApiKey: string;
};

const prefs: RaycastPreferences = getPreferenceValues();

export function toAxiosError<T>(e: unknown): AxiosError<T> {
  return e as AxiosError<T>;
}

export function isAxiosError(err: unknown): err is AxiosError {
  return "isAxiosError" in toAxiosError(err) && toAxiosError(err).isAxiosError;
}

export class UnauthorizedError extends Error {
  _tag: "UnauthorizedError" = "UnauthorizedError";
}

export const cache = setupCache({
  maxAge: 1000 * 60 * 15, // 15 min cache
  exclude: {
    query: false,
  },
});

const api = axios.create({
  adapter: cache.adapter,
  baseURL: "https://domainr.p.rapidapi.com/v2/",
  headers: {
    "x-rapidapi-host": "domainr.p.rapidapi.com",
    "x-rapidapi-key": prefs.rapidApiKey,
  },
  params: {
    "mashape-key": prefs.rapidApiKey,
  },
});

const handleError = (err: unknown) =>
  pipe(toAxiosError<{ message: string }>(err), (err) =>
    [403, 401].includes(err.response?.status ?? 500)
      ? new UnauthorizedError(err.response?.data?.message ?? "Unauthorized")
      : E.toError(err),
  );

export const getDomainStatus: R.Reader<
  ISearchResult,
  TE.TaskEither<Error | UnauthorizedError | Errors, O.Option<SearchResultWithStatus>>
> = pipe(
  R.ask<ISearchResult>(),
  R.map((result) =>
    pipe(
      TE.tryCatch(
        () =>
          api.get<IStatusResponse>("/status", {
            params: {
              domain: result.domain,
            },
          }),
        handleError,
      ),
      TE.chainEitherKW(flow((r) => r.data, StatusResponse.decode)),
      TE.map(
        flow(
          (r) => r.status,
          A.map((d) => ({
            ...result,
            status: d.summary as Status,
          })),
          A.head,
        ),
      ),
    ),
  ),
);

export const search = (query: string): TE.TaskEither<Errors | UnauthorizedError | Error, ISearchResult[]> =>
  pipe(
    TE.tryCatch(
      () =>
        api.get<ISearchResponse>("/search", {
          params: {
            query,
          },
        }),
      handleError,
    ),
    TE.chainEitherKW(flow((r) => r.data, SearchResponse.decode)),
    TE.map(({ results }) => results),
  );

export const fullSearch = flow(
  search,
  TE.chain((domains) => pipe(domains, A.map(getDomainStatus), TE.sequenceArray)),
);
