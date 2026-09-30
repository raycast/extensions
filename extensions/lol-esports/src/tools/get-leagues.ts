import type { LeaguesResponse } from "../lib/hooks/use-leagues";

export default async function () {
  const url = new URL(`/persisted/gw/getLeagues`, "https://esports-api.lolesports.com");

  url.searchParams.set("hl", "en-US");

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      // This is not a private key, it's a public key that is used to access the API.
      "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z",
    },
  });

  const { data } = (await response.json()) as LeaguesResponse;

  return {
    leagues: data.leagues.map((league) => ({
      id: league.id,
      name: league.name,
    })),
  };
}
