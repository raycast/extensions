import { Cache } from "@raycast/api";
import {
  type Movie,
  type MovieDetails,
  type MovieRatingHistogram,
  type MovieStatistics,
} from "./types";
import { parse } from "./parser";
import { Element, load } from "cheerio";
import { fetchWithRetry } from "./utils";

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

const enum SEARCH_TYPE {
  FILMS = "films",
  PEOPLE = "cast-crew",
}

export const enum AsyncStatus {
  Success,
  Error,
}

interface ApiResponse<T> {
  status: AsyncStatus;
  data: T;
}

const LETTERBOXD_URL_BASE = "https://letterboxd.com";
const SEARCH_URL_BASE = `${LETTERBOXD_URL_BASE}/s/search`;

const getSearchPageUrl = (query: string, searchType: SEARCH_TYPE) =>
  `${SEARCH_URL_BASE}/${searchType}/${encodeURIComponent(query)}/`;

export function getFullURL(path: string) {
  return `${LETTERBOXD_URL_BASE}${path}`;
}

export async function fetchPosterUrl(letterboxdId: string): Promise<string> {
  const posterUrl = `${LETTERBOXD_URL_BASE}/film/${letterboxdId}/poster/std/230`;
  const posterResponse = await fetchWithRetry(posterUrl);
  const posterData = JSON.parse(posterResponse);
  if (posterData.url2x) {
    return posterData.url2x;
  }
  return posterData.url ?? "";
}

export const fetchMoviesByTitle = async (
  title: string,
): Promise<ApiResponse<Movie[]>> => {
  const url = getSearchPageUrl(title, SEARCH_TYPE.FILMS);

  try {
    const response = await fetchWithRetry(url);
    const movies = extractEntitiesFromMovieSearchPage(response);

    // poster pngs are loaded client side after search results page load, so we mimic that here, namely
    // for each movie in the search results we need to:
    // 1. make a request to https://letterboxd.com/ajax/poster/film/<filmID, e.g. aquaman-2018>/std/70x105/
    // 2. parse the html returned in that request for img src
    const posterUrls: string[] = await Promise.all(
      movies.map((movie) => {
        return fetchPosterUrl(movie.letterboxdId);
      }),
    );
    movies.forEach((movie, index) => {
      const posterUrl = posterUrls[index];
      if (posterUrl.includes("empty-poster")) {
        movie.thumbnail = undefined;
      } else {
        movie.thumbnail = posterUrl;
      }
    });
    return { status: AsyncStatus.Success, data: movies };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: [] };
  }
};

interface MovieResponse {
  thumbnail: string;
  title: string;
  released: string;
  director: string;
  detailsPage: string;
}

function letterboxdIdFromPath(path: string): string {
  // extract the letterboxd id from the details page url, e.g. https://letterboxd.com/film/aquaman-2018/ -> aquaman-2018
  const match = path.match(/\/film\/([^/]+)\/?$/);
  if (!match || match.length < 2) {
    throw new Error(`Failed to extract letterboxd id from path: ${path}`);
  }
  return match[1];
}

function createMovieFromResponse(data: MovieResponse, index: number): Movie {
  const { thumbnail, title, released, director, detailsPage } = data;
  return {
    id: `${title}-${director}-${index}`,
    letterboxdId: letterboxdIdFromPath(detailsPage),
    thumbnail,
    title,
    released,
    director,
    detailsPage: detailsPage,
  };
}

function extractEntitiesFromMovieSearchPage(html: string): Movie[] {
  const { movies } = parse(html, {
    movies: [
      {
        selector: "ul.results li",
        value: {
          thumbnail: {
            selector: "img",
            value: "src",
          },
          title: {
            selector: 'span.film-title-wrapper a[href^="/film/"]',
          },
          released: {
            selector: 'span.film-title-wrapper a[href^="/films/year/"]',
          },
          director: {
            selector: 'a[href^="/director/"]',
          },
          detailsPage: {
            selector: 'a[href^="/film/"]',
            value: "href",
          },
        },
      },
    ],
  });

  const movieResponses: MovieResponse[] = movies.map((movie) => ({
    thumbnail: movie.thumbnail as string,
    title: movie.title as string,
    released: movie.released as string,
    director: movie.director as string,
    detailsPage: movie.detailsPage as string,
  }));

  const result: Movie[] = movieResponses.map(createMovieFromResponse);
  return result;
}

async function fetchMovieStats(letterboxdId: string): Promise<MovieStatistics> {
  const statsUrl = `${LETTERBOXD_URL_BASE}/csi/film/${letterboxdId}/stats/`;
  const statsResponse = await fetchWithRetry(statsUrl);
  return parse(statsResponse, {
    watches: {
      selector: "li.filmstat-watches a",
      value: (el: Element) => {
        const $ = load(el);
        // title attr is something like "Watched by 111,454 members"
        const match = $(el)
          .attr("title")
          ?.trim()
          .match(/([\d,]+)\smembers/);
        if (match) {
          return parseInt(match[1].replaceAll(",", ""));
        }
        return 0;
      },
    },
    lists: {
      selector: "li.filmstat-lists a",
      value: (el: Element) => {
        const $ = load(el);
        // title attr is something like "Appears in 41,036 lists"
        const match = $(el)
          .attr("title")
          ?.trim()
          .match(/([\d,]+)\slists/);
        if (match) {
          return parseInt(match[1].replaceAll(",", ""));
        }
        return 0;
      },
    },
    likes: {
      selector: "li.filmstat-likes a",
      value: (el: Element) => {
        const $ = load(el);
        // title attr is something like "Liked by 15,645 members"
        const match = $(el)
          .attr("title")
          ?.trim()
          .match(/([\d,]+)\smembers/);
        if (match) {
          return parseInt(match[1].replaceAll(",", ""));
        }
        return 0;
      },
    },
  });
}

async function fetchRatingHistogram(
  letterboxdId: string,
): Promise<MovieRatingHistogram> {
  const ratingUrl = `${LETTERBOXD_URL_BASE}/csi/film/${letterboxdId}/ratings-summary/`;
  const ratingResponse = await fetchWithRetry(ratingUrl);
  return parse(ratingResponse, {
    histogram: [
      {
        selector: "ul li.rating-histogram-bar",
        value: (el: Element) => {
          const $ = load(el);
          const countIsZero = $(el).attr("title")?.startsWith("No "); // e.g. "No half-★ ratings"
          if (countIsZero) {
            return {
              description: $(el).attr("title")?.split(" ")[1] ?? "", // e.g. "half-★"
              count: 0,
              percentage: 0,
            };
          }
          const ratingTooltip = $("a").attr("title") ?? "";
          const match = ratingTooltip.match(
            /([\d,]+)\s(.*)\sratings\s\((\d+)%\)/,
          );
          if (match) {
            return {
              count: parseInt(match[1].replaceAll(",", "")),
              description: match[2],
              percentage: parseInt(match[3]),
            };
          }
          return { count: 0, description: "", percentage: 0 };
        },
      },
    ],
    fans: {
      selector: "a[href*='/fans']",
      value: (el: Element) => {
        const $ = load(el);
        // element inner text is something like "38 fans"
        // extract the number from that string using a regex
        const fansText = $(el).text();
        const match = fansText.match(/([\d,]+)\sfan[s]*/);
        if (match) {
          return parseInt(match[1].replaceAll(",", ""));
        }
        return 0;
      },
    },
    rating: {
      selector: "span.average-rating a",
      value: (el: Element) => {
        const $ = load(el);
        // title attribute is something like "Weighted average of 2.29 based on 94,717 ratings"
        // extract the average and count from that string using a regex
        const title = $(el).attr("title") ?? "";
        const match = title.match(/([\d.]+)\sbased\son\s([\d,]+)\s/);
        if (match) {
          return {
            average: parseFloat(match[1]),
            count: parseInt(match[2].replaceAll(",", "")),
          };
        }
        return undefined;
      },
    },
  });
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

    const posterUrlPromise = fetchPosterUrl(letterboxdId);
    const ratingHistogramPromise = fetchRatingHistogram(letterboxdId);
    const statsPromise = fetchMovieStats(letterboxdId);

    data.posterUrl = await posterUrlPromise;
    data.ratingHistogram = await ratingHistogramPromise;
    data.stats = await statsPromise;

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
  };
}
