import { XMLParser } from "fast-xml-parser";

export interface MovieResult {
  sectionKey: string;
  sectionTitle: string;
  ratingKey: string;
  title: string;
  year?: string | number;
}

interface PlexSectionNode {
  key?: string | number;
  title?: string;
  type?: string;
}

interface PlexVideoNode {
  ratingKey?: string | number;
  title?: string;
  year?: string | number;
  type?: string;
  originalTitle?: string;
  titleSort?: string;
}

interface PlexMediaContainer {
  totalSize?: string;
  Directory?: PlexSectionNode | PlexSectionNode[];
  Video?: PlexVideoNode | PlexVideoNode[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  processEntities: true,
  htmlEntities: true,
});

interface PlexSection {
  key: string;
  title: string;
  type?: string;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeTitle(text: string): string {
  return [...text.toLocaleLowerCase()]
    .filter((ch) => /[\p{L}\p{N}]/u.test(ch))
    .join("");
}

function asString(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function matchesVideo(
  video: PlexVideoNode,
  targetNorm: string,
  targetLower: string,
  targetYear?: number,
  exactTitle = false,
): boolean {
  if (video.type && video.type !== "movie") {
    return false;
  }

  const movieTitle = asString(video.title);
  const searchableTitles = [
    movieTitle,
    asString(video.originalTitle),
    asString(video.titleSort),
  ];
  const normalizedTitles = searchableTitles
    .filter(Boolean)
    .map((value) => normalizeTitle(value));
  const lowerTitles = searchableTitles
    .filter(Boolean)
    .map((value) => value.toLocaleLowerCase());

  if (exactTitle) {
    if (
      !normalizedTitles.includes(targetNorm) &&
      !lowerTitles.includes(targetLower)
    ) {
      return false;
    }
  } else if (
    !normalizedTitles.some((value) => value.includes(targetNorm)) &&
    !lowerTitles.some((value) => value.includes(targetLower))
  ) {
    return false;
  }

  if (
    typeof targetYear === "number" &&
    String(targetYear) !== asString(video.year)
  ) {
    return false;
  }

  return true;
}

function buildUrl(
  baseUrl: string,
  path: string,
  token: string,
  query: Record<string, string> = {},
): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("X-Plex-Token", token);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchContainer(url: string): Promise<PlexMediaContainer> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}\n${body}`);
  }

  let parsed: { MediaContainer?: PlexMediaContainer };
  try {
    parsed = parser.parse(body) as { MediaContainer?: PlexMediaContainer };
  } catch {
    throw new Error(`Invalid XML response from ${url}`);
  }

  return parsed.MediaContainer ?? {};
}

async function getMovieSections(
  baseUrl: string,
  token: string,
): Promise<PlexSection[]> {
  const url = buildUrl(baseUrl, "/library/sections", token);
  const container = await fetchContainer(url);

  const allSections = toArray(container.Directory)
    .filter(
      (section) =>
        section.type === "movie" &&
        section.key !== undefined &&
        section.key !== null,
    )
    .map((section) => ({
      key: String(section.key),
      title: section.title ?? "(untitled section)",
      type: section.type,
    }));

  if (allSections.length > 0) {
    return allSections;
  }

  const fallbackSections = toArray(container.Directory)
    .filter(
      (section) =>
        section.key !== undefined &&
        section.key !== null &&
        section.type !== "photo",
    )
    .map((section) => ({
      key: String(section.key),
      title: section.title ?? "(untitled section)",
      type: section.type,
    }));

  return fallbackSections;
}

async function fetchSectionMovies(
  baseUrl: string,
  token: string,
  sectionKey: string,
  query: Record<string, string>,
): Promise<{ videos: PlexVideoNode[]; totalSize?: number }> {
  const url = buildUrl(
    baseUrl,
    `/library/sections/${sectionKey}/all`,
    token,
    query,
  );
  const container = await fetchContainer(url);
  const totalSize = container.totalSize
    ? Number.parseInt(container.totalSize, 10)
    : undefined;
  return {
    videos: toArray(container.Video),
    totalSize: Number.isNaN(totalSize) ? undefined : totalSize,
  };
}

async function fetchAllSectionMovies(
  baseUrl: string,
  token: string,
  sectionKey: string,
  pageSize = 200,
): Promise<PlexVideoNode[]> {
  const allVideos: PlexVideoNode[] = [];
  let start = 0;

  while (true) {
    const { videos, totalSize } = await fetchSectionMovies(
      baseUrl,
      token,
      sectionKey,
      {
        "X-Plex-Container-Start": String(start),
        "X-Plex-Container-Size": String(pageSize),
      },
    );

    if (videos.length === 0) {
      break;
    }

    allVideos.push(...videos);
    start += videos.length;

    if (typeof totalSize === "number" && start >= totalSize) {
      break;
    }

    if (videos.length < pageSize) {
      break;
    }
  }

  return allVideos;
}

function toMovieResult(
  section: PlexSection,
  video: PlexVideoNode,
): MovieResult {
  return {
    sectionKey: section.key,
    sectionTitle: section.title,
    ratingKey: asString(video.ratingKey),
    title: asString(video.title),
    year: video.year,
  };
}

function dedupeMovieResults(items: MovieResult[]): MovieResult[] {
  const unique: MovieResult[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.sectionKey}::${item.ratingKey}::${item.title}::${item.year ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

async function findMovieWithCriteria(options: {
  baseUrl: string;
  token: string;
  targetTitle: string;
  targetYear?: number;
  exactTitle?: boolean;
}): Promise<MovieResult[]> {
  const {
    baseUrl,
    token,
    targetTitle,
    targetYear,
    exactTitle = false,
  } = options;

  const sections = await getMovieSections(baseUrl, token);
  if (sections.length === 0) {
    throw new Error(
      "No accessible Plex library sections were found for this account/token.",
    );
  }

  const targetLower = targetTitle.trim().toLocaleLowerCase();
  const targetNorm = normalizeTitle(targetTitle);
  if (!targetNorm) {
    return [];
  }
  const matches: MovieResult[] = [];

  for (const section of sections) {
    const filtered = await fetchSectionMovies(baseUrl, token, section.key, {
      title: targetTitle,
    });
    const filteredMatches = filtered.videos.filter((video) =>
      matchesVideo(video, targetNorm, targetLower, targetYear, exactTitle),
    );

    // Some servers ignore `title` filter and return only the first page of all items.
    // If we did not match anything from filtered results, fall back to a full paginated scan.
    const candidates =
      filteredMatches.length > 0
        ? filteredMatches
        : await fetchAllSectionMovies(baseUrl, token, section.key);

    for (const video of candidates) {
      if (
        !matchesVideo(video, targetNorm, targetLower, targetYear, exactTitle)
      ) {
        continue;
      }

      matches.push(toMovieResult(section, video));
    }
  }

  return dedupeMovieResults(matches);
}

export async function findMovie(options: {
  baseUrl: string;
  token: string;
  targetTitle: string;
  targetYear?: number;
  exactTitle?: boolean;
}): Promise<MovieResult[]> {
  const {
    baseUrl,
    token,
    targetTitle,
    targetYear,
    exactTitle = false,
  } = options;

  const strictMatches = await findMovieWithCriteria({
    baseUrl,
    token,
    targetTitle,
    targetYear,
    exactTitle,
  });
  if (strictMatches.length > 0) {
    return strictMatches;
  }

  if (exactTitle) {
    const relaxedExactMatches = await findMovieWithCriteria({
      baseUrl,
      token,
      targetTitle,
      targetYear,
      exactTitle: false,
    });
    if (relaxedExactMatches.length > 0) {
      return relaxedExactMatches;
    }
  }

  if (typeof targetYear === "number") {
    return findMovieWithCriteria({
      baseUrl,
      token,
      targetTitle,
      exactTitle: false,
    });
  }

  return [];
}
