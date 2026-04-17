import { ContentItem, MovieDetails, VideoResponse } from "./types";
import { decryptData } from "./crypto";

const CONFIG = {
  BASE_URL: "https://api.hlowb.com",
  PROXY_URL: "https://meotvserve.utkarshg.workers.dev/api/proxy?url=",
  PACKAGE_NAME: "com.external.castle",
  CHANNEL: "IndiaA",
};

function getProxyUrl(url: string): string {
  return `${CONFIG.PROXY_URL}${encodeURIComponent(url)}`;
}

let cachedSecurityKey: { key: string | null } | null = null;

function quoteLargeInts(text: string): string {
  return text.replace(/(:\s*)(\d{16,})/g, '$1"$2"');
}

function parseJsonPreserveBigInt<T = unknown>(text: string): T {
  const safe = quoteLargeInts(text);
  return JSON.parse(safe);
}

async function getSecurityKey(
  retries: number = 3,
): Promise<{ key: string | null }> {
  if (cachedSecurityKey && cachedSecurityKey.key) {
    return cachedSecurityKey;
  }

  const url = `${CONFIG.BASE_URL}/v0.1/system/getSecurityKey/1?channel=${CONFIG.CHANNEL}&clientType=1&lang=en-US`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(getProxyUrl(url));
      const text = await res.text();

      let json: { code: number; data?: string } | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        console.warn("[MeowTV] getSecurityKey parse error", { attempt });
      }

      if (json && json.code === 200 && json.data) {
        cachedSecurityKey = { key: json.data };
        return cachedSecurityKey;
      }
    } catch (e) {
      console.warn("[MeowTV] getSecurityKey failed", {
        attempt,
        error: String(e),
      });
    }
  }
  return { key: null };
}

interface SearchResponse {
  data: {
    rows: Array<{
      title: string;
      coverVerticalImage?: string;
      coverHorizontalImage?: string;
      redirectId?: number | string;
      id?: number | string;
      movieType: number;
    }>;
  };
}

export async function search(query: string): Promise<ContentItem[]> {
  const { key } = await getSecurityKey();
  if (!key) return [];

  const url = `${CONFIG.BASE_URL}/film-api/v1.1.0/movie/searchByKeyword?channel=${CONFIG.CHANNEL}&clientType=1&keyword=${encodeURIComponent(query)}&lang=en-US&mode=1&packageName=${CONFIG.PACKAGE_NAME}&page=1&size=30`;

  try {
    const res = await fetch(getProxyUrl(url));
    const payload = await res.text();
    const decryptedJson = decryptData(payload, key);
    if (!decryptedJson) return [];

    const data = parseJsonPreserveBigInt<SearchResponse>(decryptedJson).data;
    if (!data || !data.rows) return [];

    return data.rows.map((row) => ({
      title: row.title,
      coverImage: row.coverVerticalImage || row.coverHorizontalImage || "",
      id: row.redirectId?.toString() || row.id?.toString() || "",
      type:
        row.movieType === 1 || row.movieType === 3 || row.movieType === 5
          ? "series"
          : "movie",
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

interface MovieDetailsResponse {
  data: {
    id: number | string;
    title: string;
    briefIntroduction?: string;
    coverVerticalImage?: string;
    coverHorizontalImage?: string;
    publishTime?: string | number;
    score?: number;
    episodeList?: Array<{
      id: number | string;
      title: string;
      number: number;
      seasonNo: number;
    }>;
  };
}

export async function fetchDetails(id: string): Promise<MovieDetails | null> {
  const { key } = await getSecurityKey();
  if (!key) return null;

  const url = `${CONFIG.BASE_URL}/film-api/v1.9.9/movie?channel=${CONFIG.CHANNEL}&clientType=1&lang=en-US&movieId=${id}&packageName=${CONFIG.PACKAGE_NAME}`;
  try {
    const res = await fetch(getProxyUrl(url));
    const text = await res.text();
    const decryptedJson = decryptData(text, key);
    if (!decryptedJson) return null;

    const data =
      parseJsonPreserveBigInt<MovieDetailsResponse>(decryptedJson).data;
    if (!data) return null;

    return {
      id: data.id?.toString(),
      title: data.title,
      description: data.briefIntroduction,
      coverImage: data.coverVerticalImage || data.coverHorizontalImage || "",
      backgroundImage: data.coverHorizontalImage,
      year: data.publishTime
        ? new Date(data.publishTime).getFullYear()
        : undefined,
      score: data.score,
      episodes:
        data.episodeList?.map((ep) => ({
          id: ep.id?.toString(),
          title: ep.title,
          number: ep.number,
          season: ep.seasonNo,
        })) || [],
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

interface VideoResponseData {
  data: {
    videoUrl?: string;
    subtitles?: Array<{
      abbreviate?: string;
      title?: string;
      url?: string;
    }>;
  };
}

export async function fetchStreamUrl(
  movieId: string,
  episodeId?: string,
): Promise<VideoResponse | null> {
  const { key } = await getSecurityKey();
  if (!key) return null;

  // Castle API resolves quality 2 (720p) as a good default
  const url = `${CONFIG.BASE_URL}/film-api/v2.0.1/movie/getVideo2?clientType=1&packageName=${CONFIG.PACKAGE_NAME}&channel=${CONFIG.CHANNEL}&lang=en-US`;

  const body = {
    mode: "1",
    appMarket: "GuanWang",
    clientType: "1",
    woolUser: "false",
    androidVersion: "13",
    movieId,
    episodeId: episodeId || movieId,
    isNewUser: "true",
    resolution: "3", // Higher resolution if possible
    packageName: CONFIG.PACKAGE_NAME,
  };

  try {
    const res = await fetch(getProxyUrl(url), {
      method: "POST",
      body: JSON.stringify(body),
    });

    const payload = await res.text();
    const decryptedJson = decryptData(payload, key);
    if (!decryptedJson) return null;

    const data = parseJsonPreserveBigInt<VideoResponseData>(decryptedJson).data;
    if (data && data.videoUrl) {
      return {
        videoUrl: data.videoUrl,
        subtitles: (data.subtitles || [])
          .map((s) => ({
            language: s.abbreviate || s.title || "Unknown",
            label: s.title || s.abbreviate || "Subtitles",
            url: s.url || "",
          }))
          .filter((s) => s.url),
      };
    }
  } catch (e) {
    console.error(e);
  }

  return null;
}
