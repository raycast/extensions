import { Cache } from "@raycast/api";
import {
  type Movie,
  type MovieDetails,
  type MovieRatingHistogram,
} from "./types";
import { parse } from "./parser";
import type { Element } from "domhandler";
import { load } from "cheerio";
import { fetchJsonWithRetry, fetchWithRetry } from "./utils";

const cache = new Cache();

interface CacheEntry<T> {
  lastSynced: number;
  data: T;
}

const CACHE_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 1 day

const getFromCache = <T>(key: string): T | undefined => {
  const response = cache.get(key);
  if (response) {
    const parsedResponse = JSON.parse(response) as CacheEntry<T>;
    if (Date.now() < parsedResponse.lastSynced + CACHE_EXPIRY_TIME) {
      return parsedResponse.data;
    } else {
      // Remove from cache if it has expired
      cache.remove(key);
    }
  }
};

const addToCache = <T>(key: string, value: T) => {
  const cacheEntry: CacheEntry<T> = { lastSynced: Date.now(), data: value };
  cache.set(key, JSON.stringify(cacheEntry));
};

export const enum AsyncStatus {
  Success,
  Error,
}

interface ApiResponse<T> {
  status: AsyncStatus;
  data: T;
}

const LETTERBOXD_URL_BASE = "https://letterboxd.com";
const LETTERBOXD_API_URL_BASE = "https://api.letterboxd.com/api/v0";

const getSearchUrl = (query: string) => {
  const url = new URL(`${LETTERBOXD_API_URL_BASE}/search`);
  url.searchParams.set("input", query);
  url.searchParams.set("searchMethod", "Autocomplete");
  url.searchParams.set("include", "FilmSearchItem");
  url.searchParams.set("perPage", "20");
  return url.toString();
};

export function getFullURL(path: string) {
  return `${LETTERBOXD_URL_BASE}${path}`;
}

interface LetterboxdImage {
  sizes: Array<{
    width: number;
    height: number;
    url: string;
  }>;
}

interface LetterboxdFilmSearchItem {
  type: "FilmSearchItem";
  film: {
    id: string;
    name: string;
    link: string;
    releaseYear?: number;
    rating?: number | null;
    poster?: LetterboxdImage | null;
    directors?: Array<{
      name: string;
    }>;
  };
}

interface LetterboxdSearchResponse {
  items: LetterboxdFilmSearchItem[];
}

function getPreferredImageUrl(
  image?: LetterboxdImage | null,
): string | undefined {
  const sizes = image?.sizes ?? [];
  return (
    sizes.find((size) => size.width >= 300)?.url ?? sizes[sizes.length - 1]?.url
  );
}

function getPathFromLetterboxdUrl(url: string): string {
  return new URL(url).pathname;
}

export const fetchMoviesByTitle = async (
  title: string,
): Promise<ApiResponse<Movie[]>> => {
  const url = getSearchUrl(title.trim());

  try {
    const response = await fetchJsonWithRetry<LetterboxdSearchResponse>(url);
    const movies = response.items.map(({ film }) => {
      const detailsPage = getPathFromLetterboxdUrl(film.link);
      return {
        id: film.id,
        letterboxdId: letterboxdIdFromPath(detailsPage),
        thumbnail: getPreferredImageUrl(film.poster),
        title: film.name,
        released: film.releaseYear?.toString() ?? "",
        director: film.directors?.map(({ name }) => name).join(", ") ?? "",
        detailsPage,
        rating: film.rating?.toFixed(2),
      };
    });

    return { status: AsyncStatus.Success, data: movies };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: [] };
  }
};

function letterboxdIdFromPath(path: string): string {
  // extract the letterboxd id from the details page url, e.g. https://letterboxd.com/film/aquaman-2018/ -> aquaman-2018
  const match = path.match(/\/film\/([^/]+)\/?$/);
  if (!match || match.length < 2) {
    throw new Error(`Failed to extract letterboxd id from path: ${path}`);
  }
  return match[1];
}

export async function fetchMovieDetails(
  urlPath: string,
): Promise<ApiResponse<MovieDetails>> {
  const cacheKey = urlPath.split("?")[0];
  const cachedResponse = getFromCache<MovieDetails>(cacheKey);
  if (cachedResponse) {
    return { status: AsyncStatus.Success, data: cachedResponse };
  }

  const letterboxdId = letterboxdIdFromPath(urlPath);
  const url = getFullURL(urlPath);

  try {
    const response = await fetchWithRetry(url);
    const data: MovieDetails = extractEntitiesFromMovieDetailsPage(
      response,
      url,
      letterboxdId,
    );

    addToCache(cacheKey, data);

    return { status: AsyncStatus.Success, data };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: {} as MovieDetails };
  }
}

function array(str: string | string[] | undefined): string[] {
  if (str === undefined) {
    return [];
  }
  return Array.isArray(str) ? str : [str];
}

interface StructuredMovieData {
  "@type"?: string;
  image?: string;
  aggregateRating?: {
    ratingValue?: number;
    ratingCount?: number;
  };
}

function extractStructuredMovieData(
  html: string,
): StructuredMovieData | undefined {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const rawJson = $(script).text();
    const start = rawJson.indexOf("{");
    const end = rawJson.lastIndexOf("}");
    if (start === -1 || end === -1) {
      continue;
    }

    try {
      const data = JSON.parse(
        rawJson.slice(start, end + 1),
      ) as StructuredMovieData;
      if (data["@type"] === "Movie") {
        return data;
      }
    } catch {
      // Ignore malformed structured data and continue with the HTML fields.
    }
  }
}

function getRatingFromStructuredData(
  data?: StructuredMovieData,
): MovieRatingHistogram | undefined {
  const average = data?.aggregateRating?.ratingValue;
  const count = data?.aggregateRating?.ratingCount;
  if (average === undefined || count === undefined) {
    return undefined;
  }

  return {
    histogram: [],
    rating: { average, count },
  };
}

function extractEntitiesFromMovieDetailsPage(
  html: string,
  url: string,
  letterboxId: string,
): MovieDetails {
  const {
    title,
    description,
    released,
    runtime,
    director,
    directorDetailsPageUrl,
    genres,
    reviews,
    releases,
  } = parse(html, {
    title: {
      selector: "h1.headline-1.primaryname .name",
    },
    description: {
      selector: ".review.body-text",
      value: "innerHTML",
    },
    released: {
      selector: 'a[href^="/films/year/"]',
    },
    runtime: {
      selector: ".text-link.text-footer",
      value: (el: Element) => {
        const $ = load(el);
        const runtime = $(el)
          .text()
          .trim()
          .match(/^(\d+)\s+mins/)?.[1];
        return runtime;
      },
    },
    director: {
      selector: 'a[href^="/director/"]',
    },
    directorDetailsPageUrl: {
      selector: 'a[href^="/director/"]',
      value: "href",
    },
    genres: [
      {
        selector: 'a[href^="/films/genre/"]',
      },
    ],
    reviews: [
      {
        selector: ".film-reviews .listitem article.production-viewing",
        value: {
          reviewerName: {
            selector: "a.avatar img",
            value: "alt",
          },
          reviewBody: {
            selector: ".js-review-body",
          },
          reviewUrl: {
            selector: ".attribution-detail .context",
            value: "href",
          },
          rating: {
            selector: ".rating",
            value: (el: Element) => {
              const $ = load(el);
              const rating = $(el).text().trim();
              return rating;
            },
          },
          commentCount: {
            selector: ".icon-comment .label",
            value: (el: Element) => {
              const $ = load(el);
              const commentCount = $(el).text().trim();
              return parseInt(commentCount);
            },
          },
        },
      },
    ],
    releases: [
      {
        selector: "h3.release-table-title",
        value: {
          type: {
            selector: "+",
            value: (el: Element) => {
              if (el.prev) {
                const $ = load(el.prev);
                return $(el.prev).text().trim();
              }
            },
          },
          releases: {
            selector: "+",
            value: (el: Element) => {
              const $ = load(el);
              return $(el)
                .find("> .listitem")
                .toArray()
                .map((el) => {
                  return {
                    dateString: $(el).find(".cell h5.date").text().trim(),
                    countries: $(el)
                      .find("ul.release-country-list li")
                      .toArray()
                      .map((el) => {
                        return {
                          name: $(el).find("span.name").text().trim(),
                          flagImg:
                            $(el).find("span.flag img").attr("src") ?? "",
                          certification: $(el)
                            .find("span.release-certification-badge .label")
                            .text()
                            .trim(),
                          note: $(el).find("span.release-note").text().trim(),
                        };
                      }),
                  };
                });
            },
          },
        },
      },
    ],
  });
  const structuredData = extractStructuredMovieData(html);

  return {
    id: letterboxId,
    director: director ?? "",
    directorDetailsPageUrl:
      directorDetailsPageUrl !== undefined
        ? getFullURL(directorDetailsPageUrl)
        : "",
    title: title ?? "",
    released: released ?? "",
    runtime: runtime ? parseInt(runtime) : 0,
    description: description ?? "",
    url: url,
    genres: array(genres),
    reviews,
    releases,
    posterUrl: structuredData?.image,
    ratingHistogram: getRatingFromStructuredData(structuredData),
  };
}
