import { SearchResult, SearchResultType } from "../interface/search-result";
import { ShowWatchTime } from "../interface/show-watch-time";

const BINGE_CLOCK_BASE_URL = "https://www.bingeclock.com";

const IMAGE_BASE_URL: Record<SearchResultType, string> = {
  show: "https://background-images-shows-hero.nyc3.cdn.digitaloceanspaces.com/background-images-shows-hero",
  film: "https://background-images-films-hero.nyc3.cdn.digitaloceanspaces.com/background-images-films-hero",
};

interface BingeClockSearchItem {
  title: string;
  urlname: string;
  media_type: string;
  haspic?: string;
  pic_name?: string;
  how_long_day?: string;
  how_long_hour?: string;
  how_long_minute?: string;
  year?: string;
  from_year?: string;
  to_year?: string;
  episodes?: string | number;
  runtime?: string;
}

interface BingeClockSearchResponse {
  results?: BingeClockSearchItem[];
}

function isSupportedResultType(value: string): value is SearchResultType {
  return value === "show" || value === "film";
}

function parseTimeValue(value?: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsedValue = Number.parseInt(normalized, 10);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function parseNumberValue(value?: string | number): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : Math.round(value);
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : Math.round(parsed);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function buildResultUrl(type: SearchResultType, urlname: string): string {
  const path = type === "show" ? `/s/${urlname}/` : `/film/title/${urlname}/`;
  return new URL(path, BINGE_CLOCK_BASE_URL).toString();
}

function buildImageUrl(type: SearchResultType, hasPic?: string, picName?: string): string | null {
  if (hasPic !== "y" || !picName) {
    return null;
  }

  return `${IMAGE_BASE_URL[type]}/${picName}.webp`;
}

function buildWatchTime(result: BingeClockSearchItem): ShowWatchTime {
  return {
    days: parseTimeValue(result.how_long_day),
    hours: parseTimeValue(result.how_long_hour),
    minutes: parseTimeValue(result.how_long_minute),
  };
}

function buildResultId(type: SearchResultType, urlname: string, title: string, index: number): string {
  const normalizedUrlname = urlname.trim();

  if (normalizedUrlname.length > 0) {
    return `${type}:${normalizedUrlname}`;
  }

  return `${type}:${title.toLowerCase().replace(/\s+/g, "-")}:${index}`;
}

function ensureUniqueIds(results: SearchResult[]): SearchResult[] {
  const counts = new Map<string, number>();

  return results.map((result) => {
    const currentCount = (counts.get(result.id) ?? 0) + 1;
    counts.set(result.id, currentCount);

    if (currentCount === 1) {
      return result;
    }

    return {
      ...result,
      id: `${result.id}#${currentCount}`,
    };
  });
}

export async function getSuggestions(searchTerm: string): Promise<SearchResult[]> {
  const searchQuery = encodeURIComponent(searchTerm.trim());
  const endpoint = `${BINGE_CLOCK_BASE_URL}/api/search_new/${searchQuery}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as BingeClockSearchResponse;
  const results = payload.results ?? [];

  const mappedResults = results
    .filter((result): result is BingeClockSearchItem & { media_type: SearchResultType } =>
      isSupportedResultType(result.media_type)
    )
    .map((result, index) => ({
      id: buildResultId(result.media_type, result.urlname, result.title, index),
      title: decodeHtmlEntities(result.title),
      url: buildResultUrl(result.media_type, result.urlname),
      image: buildImageUrl(result.media_type, result.haspic, result.pic_name),
      type: result.media_type,
      watchTime: buildWatchTime(result),
      year: parseNumberValue(result.year),
      fromYear: parseNumberValue(result.from_year),
      toYear: parseNumberValue(result.to_year),
      episodeCount: parseNumberValue(result.episodes),
      runtimeMinutes: parseNumberValue(result.runtime),
    }));

  return ensureUniqueIds(mappedResults);
}
