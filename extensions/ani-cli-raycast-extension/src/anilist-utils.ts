export interface AniListAnime {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native: string;
  };
  description?: string;
  episodes?: number;
  status: string;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  endDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  popularity: number;
  genres: string[];
  studios: {
    nodes: Array<{
      name: string;
      isAnimationStudio: boolean;
    }>;
  };
  coverImage: {
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  bannerImage?: string;
  format: string;
  duration?: number;
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiring: number;
  };
}

export interface AniListSearchResult {
  data: {
    Page: {
      media: AniListAnime[];
      pageInfo: {
        hasNextPage: boolean;
        currentPage: number;
        lastPage: number;
      };
    };
  };
}

const SEARCH_ANIME_QUERY = `
  query SearchAnime($search: String!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(search: $search, type: ANIME, sort: [POPULARITY_DESC, SCORE_DESC]) {
        id
        title {
          romaji
          english
          native
        }
        description
        episodes
        status
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        season
        seasonYear
        averageScore
        popularity
        genres
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
        coverImage {
          medium
          large
          extraLarge
        }
        bannerImage
        format
        duration
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
`;

const ANILIST_API_URL = "https://graphql.anilist.co";

async function makeAniListRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || "AniList API error");
    }

    return result;
  } catch (error) {
    console.error("AniList API request failed:", error);
    throw error;
  }
}

export async function searchAnime(
  query: string,
  page: number = 1,
  perPage: number = 10,
): Promise<AniListAnime[]> {
  try {
    const result = await makeAniListRequest<AniListSearchResult>(
      SEARCH_ANIME_QUERY,
      {
        search: query,
        page,
        perPage,
      },
    );

    return result.data.Page.media;
  } catch (error) {
    console.error("Failed to search anime:", error);
    return [];
  }
}

export function getBestTitle(anime: AniListAnime): string {
  return anime.title.english || anime.title.romaji || anime.title.native;
}

export function getAlternativeTitles(anime: AniListAnime): string[] {
  const titles = [];
  if (anime.title.english) titles.push(anime.title.english);
  if (anime.title.romaji) titles.push(anime.title.romaji);
  if (anime.title.native) titles.push(anime.title.native);
  return [...new Set(titles)];
}

export function formatAiringStatus(anime: AniListAnime): string {
  switch (anime.status) {
    case "RELEASING":
      return "Airing";
    case "FINISHED":
      return "Finished";
    case "NOT_YET_RELEASED":
      return "Not Yet Released";
    case "CANCELLED":
      return "Cancelled";
    case "HIATUS":
      return "Hiatus";
    default:
      return anime.status;
  }
}

export function formatDate(date?: {
  year?: number;
  month?: number;
  day?: number;
}): string {
  if (!date || !date.year) return "Unknown";

  const year = date.year;
  const month = date.month ? String(date.month).padStart(2, "0") : "??";
  const day = date.day ? String(date.day).padStart(2, "0") : "??";

  return `${year}-${month}-${day}`;
}

export function getStudioName(anime: AniListAnime): string {
  const studio = anime.studios.nodes.find((s) => s.isAnimationStudio);
  return studio?.name || anime.studios.nodes[0]?.name || "Unknown Studio";
}

export function getSeasonString(anime: AniListAnime): string {
  if (!anime.season || !anime.seasonYear) {
    return formatDate(anime.startDate);
  }

  const season = anime.season.charAt(0) + anime.season.slice(1).toLowerCase();
  return `${season} ${anime.seasonYear}`;
}

export function formatScore(score?: number): string {
  if (!score) return "N/A";
  return `${score}%`;
}

export function getNextEpisodeInfo(anime: AniListAnime): string {
  if (!anime.nextAiringEpisode) {
    return anime.status === "RELEASING" ? "Airing schedule unknown" : "";
  }

  const { episode, timeUntilAiring } = anime.nextAiringEpisode;
  const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
  const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((timeUntilAiring % (60 * 60)) / 60);

  let timeString = "";
  if (days > 0) timeString += `${days}d `;
  if (hours > 0) timeString += `${hours}h `;
  if (minutes > 0 && days === 0) timeString += `${minutes}m`;

  return `Episode ${episode} in ${timeString.trim()}`;
}

export function findBestAniCliMatch(
  aniListAnime: AniListAnime,
  searchQuery: string,
): { title: string; score: number } {
  const titles = getAlternativeTitles(aniListAnime);
  const queryLower = searchQuery.toLowerCase();

  let bestMatch = { title: getBestTitle(aniListAnime), score: 0 };

  for (const title of titles) {
    const titleLower = title.toLowerCase();
    let score = 0;

    if (titleLower === queryLower) {
      score = 100;
    } else if (titleLower.includes(queryLower)) {
      score = 80;
    } else {
      const queryWords = queryLower.split(/\s+/);
      const titleWords = titleLower.split(/\s+/);
      let wordMatches = 0;

      for (const queryWord of queryWords) {
        for (const titleWord of titleWords) {
          if (titleWord === queryWord) {
            wordMatches += 2;
          } else if (
            titleWord.includes(queryWord) ||
            queryWord.includes(titleWord)
          ) {
            wordMatches += 1;
          }
        }
      }

      score = (wordMatches / queryWords.length) * 60;
    }

    if (score > bestMatch.score) {
      bestMatch = { title, score };
    }
  }

  return bestMatch;
}
