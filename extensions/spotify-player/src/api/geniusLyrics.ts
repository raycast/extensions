const REQUEST_TIMEOUT_MS = 10000;
const MIN_REQUEST_INTERVAL = 1000;

let lastRequestTime = 0;

const htmlHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.8",
};

const jsonHeaders = {
  "User-Agent": htmlHeaders["User-Agent"],
  Accept: "application/json",
};

export interface GeniusLyricsResult {
  lyrics: string | null;
  url?: string;
}

type GeniusSearchHit = {
  result?: GeniusSongResult;
};

type GeniusSearchSection = {
  type?: string;
  hits?: GeniusSearchHit[];
};

type GeniusSongResult = {
  title?: string;
  title_with_featured?: string;
  full_title?: string;
  artist_names?: string;
  url?: string;
  primary_artist?: {
    name?: string;
  };
};

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  await rateLimitedDelay();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function cleanSearchTerm(value: string): string {
  return value
    .replace(/[([].*?[)\]]/g, " ")
    .replace(/\s+-\s+(?:remaster(?:ed)?|mono|stereo|live|edit|version|radio edit).*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value: string): string {
  return cleanSearchTerm(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getArtistName(result: GeniusSongResult): string {
  return result.primary_artist?.name || result.artist_names || result.full_title?.split(" by ").pop() || "";
}

function scoreSongResult(result: GeniusSongResult, requestedTitle: string, requestedArtist: string): number {
  const resultTitle = normalize(result.title_with_featured || result.title || "");
  const resultArtist = normalize(getArtistName(result));
  const resultFullTitle = normalize(result.full_title || "");
  const title = normalize(requestedTitle);
  const artists = [requestedArtist, requestedArtist.split(",")[0]].map((artist) => normalize(artist)).filter(Boolean);

  let score = 0;

  if (resultTitle === title) {
    score += 8;
  } else if (resultTitle.includes(title) || title.includes(resultTitle)) {
    score += 5;
  } else {
    const titleTokens = title.split(" ").filter(Boolean);
    const resultTokens = new Set(resultTitle.split(" ").filter(Boolean));
    const matchedTokens = titleTokens.filter((token) => resultTokens.has(token)).length;

    score += titleTokens.length ? (matchedTokens / titleTokens.length) * 3 : 0;
  }

  if (artists.some((artist) => resultArtist === artist)) {
    score += 6;
  } else if (artists.some((artist) => resultArtist.includes(artist) || resultFullTitle.includes(artist))) {
    score += 3;
  }

  if (result.url?.includes("lyrics")) {
    score += 1;
  }

  return score;
}

function uniqueUrls(results: GeniusSongResult[]): GeniusSongResult[] {
  const seen = new Set<string>();

  return results.filter((result) => {
    if (!result.url || seen.has(result.url)) {
      return false;
    }

    seen.add(result.url);
    return true;
  });
}

function normalizeGeniusUrl(rawUrl: string): string | undefined {
  let url = rawUrl.replace(/\\\//g, "/").replace(/&amp;/g, "&");

  if (url.startsWith("/")) {
    url = `https://genius.com${url}`;
  }

  if (!url.startsWith("https://genius.com/") || !url.includes("lyrics")) {
    return undefined;
  }

  return url.split("?")[0];
}

function getSongResultFromUrl(url: string): GeniusSongResult {
  const slug = decodeURIComponent(
    url
      .split("/")
      .pop()
      ?.replace(/-lyrics$/, "")
      .replace(/-/g, " ") || "",
  );

  return {
    url,
    title: slug,
    artist_names: slug,
    full_title: slug,
  };
}

function rankResults(results: GeniusSongResult[], songTitle: string, artistName: string): GeniusSongResult[] {
  const ranked = uniqueUrls(results)
    .map((result) => ({ result, score: scoreSongResult(result, songTitle, artistName) }))
    .sort((a, b) => b.score - a.score);
  const hasLikelyMatch = ranked.some(({ score }) => score >= 4);

  return ranked.filter(({ score }) => !hasLikelyMatch || score >= 4).map(({ result }) => result);
}

async function searchGeniusApi(songTitle: string, artistName: string): Promise<GeniusSongResult[]> {
  const encodedQuery = encodeURIComponent(`${cleanSearchTerm(songTitle)} ${cleanSearchTerm(artistName)}`);
  const apiUrl = `https://genius.com/api/search/multi?per_page=5&q=${encodedQuery}`;

  const response = await fetchWithTimeout(apiUrl, { headers: jsonHeaders });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    response?: {
      sections?: GeniusSearchSection[];
    };
  };

  const songHits =
    data.response?.sections?.flatMap((section) => (section.type === "song" ? section.hits || [] : [])) || [];

  return rankResults(
    songHits.map((hit) => hit.result).filter((result): result is GeniusSongResult => Boolean(result?.url)),
    songTitle,
    artistName,
  );
}

async function searchGeniusPage(songTitle: string, artistName: string): Promise<GeniusSongResult[]> {
  const encodedQuery = encodeURIComponent(`${cleanSearchTerm(songTitle)} ${cleanSearchTerm(artistName)}`);
  const searchUrl = `https://genius.com/search?q=${encodedQuery}`;
  const response = await fetchWithTimeout(searchUrl, { headers: htmlHeaders });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const urls = new Set<string>();
  const urlPatterns = [
    /href="(\/[^"]*lyrics[^"]*)"/g,
    /href="(https:\/\/genius\.com\/[^"]*lyrics[^"]*)"/g,
    /"url":"(https:\\?\/\\?\/genius\.com\\?\/[^"]*lyrics[^"]*)"/g,
  ];

  for (const pattern of urlPatterns) {
    for (const match of html.matchAll(pattern)) {
      const url = normalizeGeniusUrl(match[1]);

      if (url) {
        urls.add(url);
      }
    }
  }

  return rankResults([...urls].map(getSongResultFromUrl), songTitle, artistName);
}

export async function searchGeniusLyrics(songTitle: string, artistName: string): Promise<GeniusLyricsResult> {
  try {
    const apiResult = await findLyricsFromCandidates(await searchGeniusApi(songTitle, artistName));

    if (apiResult.lyrics) {
      return apiResult;
    }

    return await findLyricsFromCandidates(await searchGeniusPage(songTitle, artistName));
  } catch (error) {
    console.error("Error searching for lyrics:", error);
    return { lyrics: null };
  }
}

async function extractLyricsFromPage(songUrl: string): Promise<GeniusLyricsResult> {
  try {
    const response = await fetchWithTimeout(songUrl, { headers: htmlHeaders });

    if (!response.ok) {
      return { lyrics: null, url: songUrl };
    }

    const html = await response.text();
    const lyrics = cleanLyricsHtml(findLyricsHtml(html));

    return lyrics ? { lyrics, url: songUrl } : { lyrics: null, url: songUrl };
  } catch (error) {
    console.error("Error extracting lyrics:", error);
    return { lyrics: null, url: songUrl };
  }
}

async function findLyricsFromCandidates(candidates: GeniusSongResult[]): Promise<GeniusLyricsResult> {
  for (const candidate of uniqueUrls(candidates).slice(0, 5)) {
    if (!candidate.url) {
      continue;
    }

    const lyricsResult = await extractLyricsFromPage(candidate.url);

    if (lyricsResult.lyrics) {
      return lyricsResult;
    }
  }

  return { lyrics: null };
}

function findLyricsHtml(html: string): string {
  const lyricFragments = getLyricsContainerFragments(html);

  if (lyricFragments.length > 0) {
    return lyricFragments.join("\n");
  }

  const reactLyricsRegex = /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>(.*?)<\/div>/gs;

  for (const match of html.matchAll(reactLyricsRegex)) {
    lyricFragments.push(match[1]);
  }

  if (lyricFragments.length > 0) {
    return lyricFragments.join("\n");
  }

  const preloadedStateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*({.*?});/s);

  if (!preloadedStateMatch) {
    return "";
  }

  try {
    const data = JSON.parse(preloadedStateMatch[1]) as {
      songPage?: {
        lyricsData?: { body?: { html?: string } };
        song?: { lyrics?: string };
      };
      entities?: {
        songs?: Record<string, { lyrics?: string }>;
      };
    };
    const songEntity = data.entities?.songs ? Object.values(data.entities.songs)[0] : undefined;

    return data.songPage?.lyricsData?.body?.html || songEntity?.lyrics || data.songPage?.song?.lyrics || "";
  } catch {
    return "";
  }
}

function getLyricsContainerFragments(html: string): string[] {
  const fragments: string[] = [];
  const startTagRegex = /<div[^>]*data-lyrics-container="true"[^>]*>/gi;

  for (const match of html.matchAll(startTagRegex)) {
    const startIndex = match.index || 0;
    const contentStartIndex = startIndex + match[0].length;
    const contentEndIndex = findClosingDivIndex(html, contentStartIndex);

    if (contentEndIndex > contentStartIndex) {
      fragments.push(html.slice(contentStartIndex, contentEndIndex));
    }
  }

  return fragments;
}

function findClosingDivIndex(html: string, contentStartIndex: number): number {
  const divTagRegex = /<\/?div\b[^>]*>/gi;
  divTagRegex.lastIndex = contentStartIndex;

  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = divTagRegex.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;

    if (depth === 0) {
      return match.index;
    }
  }

  return html.length;
}

function cleanLyricsHtml(lyricsHtml: string): string | null {
  if (!lyricsHtml) {
    return null;
  }

  const lyrics = decodeHtmlEntities(lyricsHtml)
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<a[^>]*>(.*?)<\/a>/gis, "$1")
    .replace(/<\/?(?:div|span|strong|b|i|em)[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^\d+\s+Contributors?\s*/i, "")
    .replace(/^Translations?.*?(?=\[[A-Za-z])/is, "")
    .replace(/\n?Embed\s*$/i, "")
    .replace(/\n?\d+Embed\s*$/i, "")
    .replace(/\n{5,}/g, "\n\n\n")
    .trim()
    .replace(/(\[[A-Za-z][^\]]*\])/g, "\n\n$1\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();

  return lyrics.length > 5 ? lyrics : null;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    hellip: "...",
    lsquo: "'",
    rsquo: "'",
    ldquo: '"',
    rdquo: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name] || entity);
}
