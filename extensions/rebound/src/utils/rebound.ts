import { Header } from "../hooks/headers";
import {
  Rebound,
  ReboundRequestMethodType,
  ReboundRequestProtocolType,
  ReboundResponse,
  Rebounds,
} from "../types/rebound";

export type UseReboundsHelpersFactoryOptions = {
  rebounds?: Rebounds;
  setRebounds: React.Dispatch<React.SetStateAction<Rebounds>>;
};

export type ReboundHelpers = {
  addResponse: (response: ReboundResponse) => void;
  removeResponse: (response: Pick<ReboundResponse, "created">) => void;
  favoriteRebound: () => void;
  unfavoriteRebound: () => void;
  tocURL: () => string;
};

export type UseReboundsHelpersFactory = (rebound?: Rebound) => ReboundHelpers;

const EMPTY_HELPERS: ReboundHelpers = {
  addResponse: () => {},
  removeResponse: () => {},
  favoriteRebound: () => {},
  unfavoriteRebound: () => {},
  tocURL: () => "",
};

/* eslint-disable no-param-reassign */

export function useReboundsHelpersFactory({
  rebounds,
  setRebounds,
}: UseReboundsHelpersFactoryOptions): UseReboundsHelpersFactory {
  if (rebounds === undefined) {
    return () => EMPTY_HELPERS;
  }

  return (rebound) => {
    if (rebound === undefined) {
      return EMPTY_HELPERS;
    }

    const setIsFavorite = (isStarred: boolean) =>
      setRebounds((previous) => {
        const updatedRebounds = { ...previous };

        updatedRebounds[rebound.id] = {
          ...rebound,
          favorite: isStarred,
        };

        return updatedRebounds;
      });

    return {
      addResponse: (response) =>
        setRebounds((previous) => {
          const updatedRebounds = { ...previous };

          const updatedRebound = { ...rebound };
          updatedRebound.responses = [...updatedRebound.responses, response];

          updatedRebounds[rebound.id] = updatedRebound;

          return updatedRebounds;
        }),
      removeResponse: (response) =>
        setRebounds((previous) => {
          const updatedRebounds = { ...previous };

          const updatedRebound = { ...rebound };
          updatedRebound.responses = updatedRebound.responses.filter(
            (existingResponse) => existingResponse.created !== response.created,
          );

          updatedRebounds[rebound.id] = updatedRebound;

          return updatedRebounds;
        }),
      favoriteRebound: () => setIsFavorite(true),
      unfavoriteRebound: () => setIsFavorite(false),
      tocURL: () => {
        let cURL = `curl -X ${rebound.details.method} ${rebound.url.toString()}`;

        if (rebound.details.headers && Object.keys(rebound.details.headers).length > 0) {
          cURL += ` ${Object.entries(rebound.details.headers)
            .map(([key, value]) => `-H "${key}: ${value}"`)
            .join(" ")}`;
        }

        if (rebound.details.body) {
          cURL += ` -d '${rebound.details.body}'`;
        }

        return cURL;
      },
    };
  };
}

/* eslint-enable no-param-reassign */

export type UseReboundOptions = {
  reboundId: Rebound["id"];
} & UseReboundsHelpersFactoryOptions;

export type UseReboundHelpers = {
  rebound?: Rebound;
} & ReboundHelpers;

export function useReboundHelpers({ reboundId, rebounds, setRebounds }: UseReboundOptions): UseReboundHelpers {
  const rebound = rebounds?.[reboundId];
  const helpersFactory = useReboundsHelpersFactory({ rebounds, setRebounds });

  return {
    rebound,
    ...helpersFactory(rebound),
  };
}

export function getUrlDetails(
  method: ReboundRequestMethodType,
  url: URL,
  headers: Record<string, Header>,
  body: string,
): Rebound["details"] {
  return {
    method,
    protocol: url.protocol as ReboundRequestProtocolType,
    hostname: url.hostname,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.entries(headers).reduce((accumulator, [, { key, value }]) => {
      if (key === "" || value === "") {
        return accumulator;
      }

      return {
        ...accumulator,
        [key]: value,
      };
    }, {}),
    ...(body !== "" ? { body } : {}),
  };
}
