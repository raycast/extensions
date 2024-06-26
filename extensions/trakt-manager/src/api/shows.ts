import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "../lib/constants";
import { oauthProvider } from "../lib/oauth";

export const searchShows = async (query: string, page: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(
    `${TRAKT_API_URL}/search/show?query=${encodeURIComponent(query)}&page=${page}&limit=10&fields=title`,
    {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": TRAKT_CLIENT_ID,
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );

  if (!response.ok) {
    console.error("searchShows:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  result.page = Number(response.headers.get("X-Pagination-Page") ?? 1);
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count") ?? 1);
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count") ?? result.length);

  return result;
};

export const getWatchlistShows = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/shows/added?page=${page}&limit=10&fields=title`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getWatchlistShows:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  result.page = Number(response.headers.get("X-Pagination-Page") ?? 1);
  result.total_pages = Number(response.headers.get("X-Pagination-Page-Count") ?? 1);
  result.total_results = Number(response.headers.get("X-Pagination-Item-Count") ?? result.length);

  return result;
};

export const getSeasons = async (traktId: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/shows/${traktId}/seasons?extended=full`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getSeasons:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as TraktSeasonList;
};

export const getEpisodes = async (
  showId: number,
  seasonNumber: number,
  signal: AbortSignal | undefined = undefined,
) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/shows/${showId}/seasons/${seasonNumber}?extended=full`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getEpisodes:", await response.text());
    throw new Error(response.statusText);
  }

  return (await response.json()) as TraktEpisodeList;
};

export const addShowToWatchlist = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("addShowToWatchlist:", await response.text());
    throw new Error(response.statusText);
  }
};

export const removeShowFromWatchlist = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watchlist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("removeShowFromWatchlist:", await response.text());
    throw new Error(response.statusText);
  }
};

export const checkInEpisode = async (episodeId: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("checkInEpisode:", await response.text());
    throw new Error(response.statusText);
  }
};

const setShowProgress = (showProgress: TraktShowProgress, show: TraktShowListItem) => {
  if (
    showProgress.reset_at &&
    show.last_updated_at &&
    new Date(showProgress.reset_at).getTime() > new Date(show.last_updated_at).getTime()
  ) {
    show.show.progress = undefined;
  } else {
    show.show.progress = showProgress.aired > showProgress.completed ? showProgress : undefined;
  }
};

export const getUpNextShows = async (
  signal: AbortSignal | undefined = undefined,
  page: number = 1,
): Promise<TraktShowList> => {
  const upNextShowsCache = await LocalStorage.getItem<string>("upNextShows");
  if (upNextShowsCache) {
    return JSON.parse(upNextShowsCache) as TraktShowList;
  }

  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watched/shows?extended=noseasons`, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getUpNextShows:", await response.text());
    throw new Error(response.statusText);
  }

  const result = (await response.json()) as TraktShowList;
  const showPromises = result.map((show) =>
    fetch(
      `${TRAKT_API_URL}/shows/${show.show.ids.trakt}/progress/watched?hidden=false&specials=false&count_specials=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": TRAKT_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      },
    ).then((res) => ({ res, traktId: show.show.ids.trakt })),
  );

  const showResponses = await Promise.all(showPromises);
  for (const { res, traktId } of showResponses) {
    if (!res.ok) {
      console.error("getUpNextShows:", await response.text());
      throw new Error(res.statusText);
    }

    const showProgress = (await res.json()) as TraktShowProgress;
    const show = result.find((s) => s.show.ids.trakt === traktId);
    if (show) {
      setShowProgress(showProgress, show);
    }
  }

  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const upNextShows = result.filter((show) => show.show.progress).slice(startIndex, endIndex) as TraktShowList;
  await LocalStorage.setItem("upNextShows", JSON.stringify(upNextShows));
  upNextShows.total_pages = Math.floor(upNextShows.length / pageSize);
  upNextShows.total_results = upNextShows.length;
  return upNextShows;
};

export const updateShowProgress = async (
  showId: number,
  signal: AbortSignal | undefined = undefined,
): Promise<void> => {
  const upNextShowsCache = await LocalStorage.getItem<string>("upNextShows");
  if (upNextShowsCache) {
    const upNextShows = JSON.parse(upNextShowsCache) as TraktShowList;
    const show = upNextShows.find((s) => s.show.ids.trakt === showId);

    if (show) {
      const accessToken = await oauthProvider.authorize();
      const response = await fetch(
        `${TRAKT_API_URL}/shows/${showId}/progress/watched?hidden=false&specials=false&count_specials=false`,
        {
          headers: {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": TRAKT_CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
        },
      );

      if (!response.ok) {
        console.error("updateShowProgress:", await response.text());
        throw new Error(response.statusText);
      }

      const showProgress = (await response.json()) as TraktShowProgress;
      setShowProgress(showProgress, show);
      const upNextShowsFiltered = upNextShows.filter((show) => show.show.progress);
      await LocalStorage.setItem("upNextShows", JSON.stringify(upNextShowsFiltered));
    }
  }
};

export const addNewShowProgress = async (
  show: TraktShowListItem,
  signal: AbortSignal | undefined = undefined,
): Promise<void> => {
  const upNextShowsCache = await LocalStorage.getItem<string>("upNextShows");
  if (upNextShowsCache) {
    const accessToken = await oauthProvider.authorize();
    const response = await fetch(
      `${TRAKT_API_URL}/shows/${show.show.ids.trakt}/progress/watched?hidden=false&specials=false&count_specials=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": "2",
          "trakt-api-key": TRAKT_CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      },
    );

    if (!response.ok) {
      console.error("updateShowProgress:", await response.text());
      throw new Error(response.statusText);
    }

    const showProgress = (await response.json()) as TraktShowProgress;
    setShowProgress(showProgress, show);

    const upNextShows = JSON.parse(upNextShowsCache) as TraktShowList;
    upNextShows.push(show);
    const upNextShowsFiltered = upNextShows.filter((show) => show.show.progress);
    await LocalStorage.setItem("upNextShows", JSON.stringify(upNextShowsFiltered));
  }
};

export const addShowToHistory = async (showId: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("addShowToHistory:", await response.text());
    throw new Error(response.statusText);
  }
};

export const getHistoryShows = async (page: number, signal: AbortSignal | undefined = undefined) => {
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/watched/shows?extended=noseasons`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  if (!response.ok) {
    console.error("getHistoryShows:", await response.text());
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
  const accessToken = await oauthProvider.authorize();
  const response = await fetch(`${TRAKT_API_URL}/sync/history/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
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
    console.error("removeShowFromHistory:", await response.text());
    throw new Error(response.statusText);
  }
};
