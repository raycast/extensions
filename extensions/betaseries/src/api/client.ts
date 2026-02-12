import { getPreferenceValues } from "@raycast/api";
import { URLSearchParams } from "url";
import {
  BetaSeriesResponse,
  Show,
  Movie,
  Episode,
  MemberPlanning,
} from "../types/betaseries";

export const BASE_URL = "https://api.betaseries.com";
type BetaSeriesPreferences = {
  apiKey: string;
  token?: string;
};

export const getHeaders = () => {
  const { apiKey, token } = getPreferenceValues<BetaSeriesPreferences>();
  const headers: Record<string, string> = {
    "X-BetaSeries-Key": apiKey,
    "X-BetaSeries-Version": "3.0",
    "Content-Type": "application/json",
  };
  if (token) {
    headers["X-BetaSeries-Token"] = token;
  }
  return headers;
};

export const hasToken = () => {
  const { token } = getPreferenceValues<BetaSeriesPreferences>();
  return Boolean(token);
};

export const buildBetaSeriesUrl = (
  endpoint: string,
  params: Record<string, string> = {},
) => {
  const url = new URL(`${BASE_URL}${endpoint}`);
  const searchParams = new URLSearchParams(params);
  url.search = searchParams.toString();
  return url.toString();
};

export async function parseBetaSeriesResponse<T>(
  response: Response,
): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Unauthorized. Please check your BetaSeries Token in extension preferences.",
      );
    }

    let errorData: { errors?: { text: string; code?: number }[] } | null = null;
    try {
      errorData = (await response.json()) as {
        errors?: { text: string; code?: number }[];
      };
    } catch {
      // JSON parse failed, we'll use generic error below
    }

    if (errorData?.errors && errorData.errors.length > 0) {
      const errorText = errorData.errors[0].text;
      if (
        errorText.includes(`paramètre "id" est manquant`) ||
        errorText.includes('parameter "id" is missing')
      ) {
        throw new Error(
          "Invalid Token. You may have entered the API Key instead of the OAuth Token, or the token is expired.",
        );
      }
      throw new Error(`BetaSeries Error: ${errorText}`);
    }

    throw new Error(
      `BetaSeries API Error: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BetaSeriesResponse<T>;
  return data as T;
}

async function fetchBetaSeries<T>(
  endpoint: string,
  params: Record<string, string> = {},
  method: string = "GET",
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  const fetchOptions: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  } = {
    method,
    headers: getHeaders(),
  };

  if (method === "GET") {
    const searchParams = new URLSearchParams(params);
    url.search = searchParams.toString();
  } else {
    // For POST, PUT, DELETE, send params in body as form data
    const formData = new URLSearchParams(params);
    fetchOptions.body = formData.toString();
    fetchOptions.headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url.toString(), fetchOptions);
  return parseBetaSeriesResponse<T>(response);
}

export async function searchShows(title: string): Promise<Show[]> {
  const data = await fetchBetaSeries<{ shows: Show[] }>("/shows/search", {
    title,
  });
  return data.shows;
}

export async function searchMovies(title: string): Promise<Movie[]> {
  const data = await fetchBetaSeries<{ movies: Movie[] }>("/movies/search", {
    title,
  });
  return data.movies;
}

export async function getMyShows(status?: string): Promise<Show[]> {
  // status: active, archived, etc.
  // /shows/member
  const { token } = getPreferenceValues<BetaSeriesPreferences>();
  if (!token) {
    throw new Error(
      "This command requires a BetaSeries Token. Please add it in the extension preferences.",
    );
  }
  const params: Record<string, string> = { limit: "100" };
  if (status) params.status = status;

  const data = await fetchBetaSeries<{ shows: Show[] }>(
    "/shows/member",
    params,
  );
  return data.shows;
}

export async function getMyMovies(state?: number): Promise<Movie[]> {
  // state: 0 = to watch, 1 = watched
  const { token } = getPreferenceValues<BetaSeriesPreferences>();
  if (!token) {
    throw new Error(
      "This command requires a BetaSeries Token. Please add it in the extension preferences.",
    );
  }
  const params: Record<string, string> = { limit: "100" };
  if (state !== undefined) params.state = String(state);

  const data = await fetchBetaSeries<{ movies: Movie[] }>(
    "/movies/member",
    params,
  );
  return data.movies;
}

interface PlanningItem {
  date?: string;
  id?: number;
  episode_id?: number;
  show?: {
    id?: number;
    title?: string;
  };
  show_id?: number;
  show_title?: string;
  season?: number;
  episode?: number;
  title?: string;
  code?: string;
}

interface PlanningResponse {
  planning?: PlanningItem[];
  episodes?: PlanningItem[];
}

export async function getPlanning(): Promise<MemberPlanning[]> {
  const { token } = getPreferenceValues<BetaSeriesPreferences>();
  if (!token) {
    throw new Error(
      "This command requires a BetaSeries Token. Please add it in the extension preferences.",
    );
  }
  const response = await fetchBetaSeries<PlanningResponse | PlanningItem[]>(
    "/planning/member",
  );

  let rawItems: PlanningItem[] = [];

  // Try different response structures
  if (Array.isArray(response)) {
    rawItems = response;
  } else if (response.planning && Array.isArray(response.planning)) {
    rawItems = response.planning;
  } else if (response.episodes && Array.isArray(response.episodes)) {
    rawItems = response.episodes;
  } else {
    throw new Error("Unexpected planning response format from BetaSeries API.");
  }

  // Transform the items to match our MemberPlanning interface
  return rawItems.map((item: PlanningItem) => ({
    date: item.date || "",
    episode_id: item.id || item.episode_id || 0,
    show_id: item.show?.id || item.show_id || 0,
    show_title: item.show?.title || item.show_title || "Unknown Show",
    season: item.season || 0,
    episode: item.episode || 0,
    title: item.title || "",
    code: item.code || `S${item.season || 0}E${item.episode || 0}`,
  }));
}

export async function getUnwatchedEpisodes(showId: number): Promise<Episode[]> {
  const { token } = getPreferenceValues<BetaSeriesPreferences>();
  if (!token) {
    throw new Error(
      "This command requires a BetaSeries Token. Please add it in the extension preferences.",
    );
  }
  const data = await fetchBetaSeries<{ shows: Array<{ unseen: Episode[] }> }>(
    "/episodes/list",
    { showId: String(showId) },
  );
  // Extract episodes from shows[0].unseen
  return data.shows && data.shows.length > 0 && data.shows[0].unseen
    ? data.shows[0].unseen
    : [];
}

export async function markEpisodeAsWatched(
  id: string,
  bulk: boolean = false,
): Promise<void> {
  await fetchBetaSeries(
    "/episodes/watched",
    { id, bulk: bulk ? "true" : "false" },
    "POST",
  );
}

export async function getMovieDetails(id: number): Promise<Movie> {
  const data = await fetchBetaSeries<{ movie: Movie }>("/movies/movie", {
    id: String(id),
  });
  return data.movie;
}

export async function markMovieAsWatched(id: number): Promise<void> {
  await fetchBetaSeries(
    "/movies/movie",
    { id: String(id), state: "1" },
    "POST",
  );
}

export async function markMovieAsUnwatched(id: number): Promise<void> {
  await fetchBetaSeries(
    "/movies/movie",
    { id: String(id), state: "0" },
    "POST",
  );
}

export async function rateMovie(id: number, rating: number): Promise<void> {
  await fetchBetaSeries(
    "/movies/note",
    { id: String(id), note: String(rating) },
    "POST",
  );
}

export async function addMovieToList(id: number): Promise<void> {
  // state: 0 = to watch (default)
  await fetchBetaSeries(
    "/movies/movie",
    { id: String(id), state: "0" },
    "POST",
  );
}

export async function addShowToList(id: number): Promise<void> {
  await fetchBetaSeries("/shows/show", { id: String(id) }, "POST");
}

export async function archiveShow(id: number): Promise<void> {
  await fetchBetaSeries("/shows/archive", { id: String(id) }, "POST");
}

export async function unarchiveShow(id: number): Promise<void> {
  await fetchBetaSeries("/shows/archive", { id: String(id) }, "DELETE");
}
