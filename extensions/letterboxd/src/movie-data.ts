import type { Element } from "domhandler";
import { load } from "cheerio";
import { parse } from "./parser";
import type {
  Movie,
  MovieDetails,
  MovieLinks,
  MovieRatingHistogram,
  NamedLink,
} from "./types";

const LETTERBOXD_URL_BASE = "https://letterboxd.com";

interface LetterboxdImage {
  sizes?: Array<{ width: number; height: number; url: string }>;
}

interface LetterboxdFilm {
  id: string;
  name: string;
  link: string;
  releaseYear?: number;
  rating?: number | null;
  runTime?: number | null;
  top250Position?: number | null;
  poster?: LetterboxdImage | null;
  directors?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  links?: Array<{ type: string; url: string }>;
}

interface LetterboxdSearchItem {
  type: string;
  film?: LetterboxdFilm;
}

export interface LetterboxdSearchResponse {
  items?: LetterboxdSearchItem[];
  next?: string;
}

interface StructuredEntity {
  name?: string;
  sameAs?: string;
}

interface StructuredMovieData {
  "@type"?: string;
  "@graph"?: StructuredMovieData[];
  image?: string;
  dateCreated?: string;
  inLanguage?: string[] | string;
  actor?: StructuredEntity[];
  productionCompany?: StructuredEntity[];
  countryOfOrigin?: StructuredEntity[];
  aggregateRating?: { ratingValue?: number; ratingCount?: number };
}

export function getFullURL(path: string): string {
  return new URL(path, LETTERBOXD_URL_BASE).toString();
}

export function letterboxdIdFromPath(path: string): string {
  const match = new URL(path, LETTERBOXD_URL_BASE).pathname.match(
    /\/film\/([^/]+)\/?$/,
  );
  if (!match)
    throw new Error(`Failed to extract Letterboxd ID from path: ${path}`);
  return match[1];
}

function getPreferredImageUrl(
  image?: LetterboxdImage | null,
): string | undefined {
  const sizes = image?.sizes ?? [];
  return sizes.find((size) => size.width >= 300)?.url ?? sizes.at(-1)?.url;
}

function normalizeLinks(film: LetterboxdFilm, detailsPage: string): MovieLinks {
  const links: MovieLinks = { letterboxd: getFullURL(detailsPage) };
  for (const link of film.links ?? []) {
    if (link.type === "imdb") links.imdb = link.url;
    if (link.type === "tmdb") links.tmdb = link.url;
    if (link.type === "letterboxd") links.letterboxd = link.url;
  }
  return links;
}

export function normalizeSearchResponse(
  response: LetterboxdSearchResponse,
): Movie[] {
  return (response.items ?? []).flatMap((item) => {
    const film = item.film;
    if (item.type !== "FilmSearchItem" || !film) return [];

    try {
      const detailsPage = new URL(film.link, LETTERBOXD_URL_BASE).pathname;
      return [
        {
          id: film.id,
          letterboxdId: letterboxdIdFromPath(detailsPage),
          thumbnail: getPreferredImageUrl(film.poster),
          title: film.name,
          released: film.releaseYear?.toString() ?? "",
          director: film.directors?.map(({ name }) => name).join(", ") ?? "",
          detailsPage,
          rating: film.rating ?? undefined,
          runtime: film.runTime ?? undefined,
          genres: film.genres?.map(({ name }) => name),
          top250Position: film.top250Position ?? undefined,
          links: normalizeLinks(film, detailsPage),
        },
      ];
    } catch {
      return [];
    }
  });
}

export function getSearchCursor(next?: string): string | undefined {
  if (!next) return undefined;
  return new URLSearchParams(next).get("cursor") ?? undefined;
}

function array(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getStructuredMovieCandidates(value: unknown): StructuredMovieData[] {
  if (Array.isArray(value)) return value.flatMap(getStructuredMovieCandidates);
  if (!value || typeof value !== "object") return [];

  const data = value as StructuredMovieData;
  return [
    data,
    ...(data["@graph"]?.flatMap(getStructuredMovieCandidates) ?? []),
  ];
}

function extractStructuredMovieData(
  html: string,
): StructuredMovieData | undefined {
  const $ = load(html);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    const rawJson = $(script).text().trim();
    const candidates = [rawJson];
    const start = rawJson.indexOf("{");
    const end = rawJson.lastIndexOf("}");
    if (start > 0 || end < rawJson.length - 1) {
      candidates.push(rawJson.slice(start, end + 1));
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        const movie = getStructuredMovieCandidates(parsed).find(
          (value) => value["@type"] === "Movie",
        );
        if (movie) return movie;
      } catch {
        // Continue with another script or the HTML fields.
      }
    }
  }
}

function getRatingFromStructuredData(
  data?: StructuredMovieData,
): MovieRatingHistogram | undefined {
  const average = data?.aggregateRating?.ratingValue;
  const count = data?.aggregateRating?.ratingCount;
  if (average === undefined || count === undefined) return undefined;
  return { histogram: [], rating: { average, count } };
}

function normalizeNamedLinks(
  values?: StructuredEntity[],
): NamedLink[] | undefined {
  const links = values?.flatMap(({ name, sameAs }) =>
    name ? [{ name, url: sameAs }] : [],
  );
  return links?.length ? links : undefined;
}

function normalizeNames(values?: StructuredEntity[]): string[] | undefined {
  const names = values?.flatMap(({ name }) => (name ? [name] : []));
  return names?.length ? names : undefined;
}

export function extractMovieDetails(
  html: string,
  url: string,
  path: string,
): MovieDetails {
  const letterboxdId = letterboxdIdFromPath(path);
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
    title: { selector: "h1.headline-1.primaryname .name" },
    description: { selector: ".review.body-text", value: "innerHTML" },
    released: { selector: 'a[href^="/films/year/"]' },
    runtime: {
      selector: ".text-link.text-footer",
      value: (el: Element) =>
        load(el)(el)
          .text()
          .trim()
          .match(/^(\d+)\s+mins/)?.[1],
    },
    director: { selector: 'a[href^="/director/"]' },
    directorDetailsPageUrl: {
      selector: 'a[href^="/director/"]',
      value: "href",
    },
    genres: [{ selector: 'a[href^="/films/genre/"]' }],
    reviews: [
      {
        selector: ".film-reviews .listitem article.production-viewing",
        value: {
          reviewerName: { selector: "a.avatar img", value: "alt" },
          reviewBody: { selector: ".js-review-body" },
          reviewUrl: {
            selector: ".attribution-detail .context",
            value: "href",
          },
          rating: { selector: ".rating" },
          commentCount: {
            selector: ".icon-comment .label",
            value: (el: Element) => Number.parseInt(load(el)(el).text().trim()),
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
            value: (el: Element) =>
              el.prev ? load(el.prev)(el.prev).text().trim() : undefined,
          },
          releases: {
            selector: "+",
            value: (el: Element) => {
              const $ = load(el);
              return $(el)
                .find("> .listitem")
                .toArray()
                .map((release) => ({
                  dateString: $(release).find(".cell h5.date").text().trim(),
                  countries: $(release)
                    .find("ul.release-country-list li")
                    .toArray()
                    .map((country) => ({
                      name: $(country).find("span.name").text().trim(),
                      flagImg:
                        $(country).find("span.flag img").attr("src") ?? "",
                      certification: $(country)
                        .find("span.release-certification-badge .label")
                        .text()
                        .trim(),
                      note: $(country).find("span.release-note").text().trim(),
                    })),
                }));
            },
          },
        },
      },
    ],
  });
  const structuredData = extractStructuredMovieData(html);

  return {
    id: letterboxdId,
    director: director ?? "",
    directorDetailsPageUrl: directorDetailsPageUrl
      ? getFullURL(directorDetailsPageUrl)
      : "",
    title: title ?? "",
    released: released ?? "",
    releaseDate: structuredData?.dateCreated,
    runtime: runtime ? Number.parseInt(runtime) : undefined,
    description: description ?? "",
    url,
    genres: array(genres),
    reviews,
    releases,
    posterUrl: structuredData?.image,
    ratingHistogram: getRatingFromStructuredData(structuredData),
    languages: array(structuredData?.inLanguage),
    countries: normalizeNames(structuredData?.countryOfOrigin),
    cast: normalizeNamedLinks(structuredData?.actor),
    productionCompanies: normalizeNamedLinks(structuredData?.productionCompany),
  };
}
