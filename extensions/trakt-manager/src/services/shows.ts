import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "../lib/constants";
import { oauthClient } from "../lib/oauth";

export const searchShows = async (query: string, page: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(
    `${TRAKT_API_URL}/search/show?query=${encodeURIComponent(query)}&page=${page}&limit=10&fields=title`,
    {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID,
        Authorization: `Bearer ${tokens?.accessToken}`,
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  result.page = Number(response.headers.get("X-Pagination-Page") ?? 1);
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count") ?? 1);
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count") ?? result.length);

  return result;
};

export const getWatchlistShows = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/shows/added?page=${page}&limit=10&fields=title`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  result.page = Number(response.headers.get("X-Pagination-Page") ?? 1);
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count") ?? 1);
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count") ?? result.length);

  return result;
};

export const getSeasons = async (traktId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/shows/${traktId}/seasons?extended=full`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return (await response.json()) as TraktSeasonList;
};

export const getEpisodes = async (
  traktId: number,
  seasonNumber: number,
  signal: AbortSignal | undefined = undefined,
) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/shows/${traktId}/seasons/${seasonNumber}?extended=full`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return (await response.json()) as TraktEpisodeList;
};

export const addShowToWatchlist = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      shows: [
        {
          ids: {
            trakt: showId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

export const removeShowFromWatchlist = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      shows: [
        {
          ids: {
            trakt: showId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

export const checkInEpisode = async (episodeId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      episode: {
        ids: {
          trakt: episodeId,
        },
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

const setShowProgress = (showProgress: TraktShowProgress, show: TraktUpNextShowListItem) => {
  if (showProgress.reset_at && new Date(showProgress.reset_at).getTime() > new Date(show.last_updated_at).getTime()) {
    show.show.progress = undefined;
  } else {
    show.show.progress = showProgress.aired > showProgress.completed ? showProgress : undefined;
  }
};

export const getUpNextShows = async (signal: AbortSignal | undefined = undefined): Promise<TraktUpNextShowList> => {
  const upNextShowsCache = await LocalStorage.getItem<string>("upNextShows");
  if (upNextShowsCache) {
    return JSON.parse(upNextShowsCache) as TraktUpNextShowList;
  }

  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watched/shows?extended=noseasons`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktUpNextShowList;
  const showPromises = result.map((show) =>
    fetch(
      `${TRAKT_API_URL}/shows/${show.show.ids.trakt}/progress/watched?hidden=false&specials=false&count_specials=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": TRAKT_CLIENT_ID,
          Authorization: `Bearer ${tokens?.accessToken}`,
        },
        signal,
      },
    ).then((res) => ({ res, traktId: show.show.ids.trakt })),
  );

  const showResponses = await Promise.all(showPromises);
  for (const { res, traktId } of showResponses) {
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    const showProgress = (await res.json()) as TraktShowProgress;
    const show = result.find((s) => s.show.ids.trakt === traktId);
    if (show) {
      setShowProgress(showProgress, show);
    }
  }

  const upNextShows = result.filter((show) => show.show.progress);
  await LocalStorage.setItem("upNextShows", JSON.stringify(upNextShows));
  return upNextShows;
};

export const updateShowProgress = async (
  showId: number,
  signal: AbortSignal | undefined = undefined,
): Promise<void> => {
  const upNextShowsCache = await LocalStorage.getItem<string>("upNextShows");
  if (upNextShowsCache) {
    const upNextShows = JSON.parse(upNextShowsCache) as TraktUpNextShowList;
    const show = upNextShows.find((s) => s.show.ids.trakt === showId);

    if (show) {
      const tokens = await oauthClient.getTokens();
      const response = await fetch(
        `${TRAKT_API_URL}/shows/${showId}/progress/watched?hidden=false&specials=false&count_specials=false`,
        {
          headers: {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": TRAKT_CLIENT_ID,
            Authorization: `Bearer ${tokens?.accessToken}`,
          },
          signal,
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const showProgress = (await response.json()) as TraktShowProgress;
      setShowProgress(showProgress, show);
      const upNextShowsFiltered = upNextShows.filter((show) => show.show.progress);
      await LocalStorage.setItem("upNextShows", JSON.stringify(upNextShowsFiltered));
    }
  }
};

export const addShowToHistory = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      shows: [
        {
          ids: {
            trakt: showId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};

export const getHistoryShows = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/watched/shows?extended=noseasons`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  result.sort((a, b) => {
    const dateA = new Date(a.last_watched_at || 0);
    const dateB = new Date(b.last_watched_at || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageResult = result.slice(startIndex, endIndex) as TraktShowList;

  pageResult.page = page;
  pageResult.total_pages = Math.floor(result.length / pageSize);
  pageResult.total_results = result.length;

  return pageResult;
};

export const removeShowFromHistory = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const tokens = await oauthClient.getTokens();
  const response = await fetch(`${TRAKT_API_URL}/sync/history/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${tokens?.accessToken}`,
    },
    body: JSON.stringify({
      shows: [
        {
          ids: {
            trakt: showId,
          },
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
};
