import { initClient } from "@ts-rest/core";
import fetch, { AbortError } from "node-fetch";
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "./constants";
import { TraktContract } from "./contract";
import { AuthProvider } from "./oauth";

export const initTraktClient = () => {
  return initClient(TraktContract, {
    baseUrl: TRAKT_API_URL,
    baseHeaders: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
    },
    api: async ({ path, method, body, headers, fetchOptions }) => {
      const accessToken = await AuthProvider.authorize();
      const traktClientId = TRAKT_CLIENT_ID;

      try {
        const response = await fetch(path, {
          method,
          headers: {
            ...headers,
            Authorization: `Bearer ${accessToken}`,
            "trakt-api-key": traktClientId,
          },
          body,
          ...fetchOptions,
        });
        const json = await response.json();

        // Uncomment this line to log API requests
        // console.log(
        //   "[API Request]",
        //   JSON.stringify(
        //     {
        //       method,
        //       path,
        //       body,
        //       headers,
        //       status: response.status,
        //       statusText: response.statusText,
        //     },
        //     null,
        //     2,
        //   ),
        // );

        const compatResponse = {
          status: response.status,
          body: json,
          headers: Object.fromEntries(response.headers.entries()) as unknown as Headers,
        };

        return compatResponse;
      } catch (error) {
        if (!(error instanceof AbortError)) {
          console.error("[API Request Error]", error);
        }
        return {
          status: 500,
          body: undefined,
          headers: {} as Headers,
        };
      }
    },
  });
};
