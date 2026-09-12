import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import { environment, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { provisionDeviceToken } from "./device-token";
import { getPreferences } from "./preferences";
import type { MetadataResponse, StreamsResponse, UsageInfo } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function resolveToken(): Promise<string> {
  const { apiToken } = getPreferences();
  if (apiToken) return apiToken;

  const device = await provisionDeviceToken();
  return device.token;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const { instanceUrl } = getPreferences();
  const token = await resolveToken();

  const url = `${instanceUrl}${path}`;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    let code: string | undefined;
    try {
      const json = JSON.parse(body) as { code?: string };
      code = json.code;
    } catch {
      code = undefined;
    }

    let message: string;
    switch (res.status) {
      case 401:
        message = getPreferences().apiToken
          ? "Your API token isn't valid anymore."
          : "Trial session expired. It'll refresh automatically.";
        break;
      case 402:
        message = getPreferences().apiToken
          ? "You're out of credits. Check your usage."
          : "Trial credits used up. Add an API token for more.";
        break;
      case 429:
        message = "Too many requests. Try again in a moment.";
        break;
      default:
        message = mapErrorCode(code) ?? (body || `Request failed (${res.status})`);
    }

    throw new ApiError(res.status, message, code);
  }

  return res.json() as Promise<T>;
}

function mapErrorCode(code: string | undefined): string | null {
  if (!code) return null;

  const map: Record<string, string> = {
    "url.invalid": "That URL doesn't look right.",
    "url.unsupported_platform": "That site isn't supported yet.",
    "url.unsupported_link": "That kind of link isn't supported.",
    "content.not_found": "That post isn't available anymore.",
    "content.private": "This post is private.",
    "content.age_restricted": "Age-restricted content can't be downloaded.",
    "content.region_locked": "This content is region-locked.",
    "content.no_media": "No downloadable media in this post.",
    "content.live": "Live content can't be downloaded.",
    "content.blocked": "This content has been blocked.",
    "platform.rate_limited": "That site is rate-limiting requests. Try again shortly.",
    "usage.exceeded": getPreferences().apiToken
      ? "You're out of credits. Check your usage."
      : "Trial credits used up. Add an API token for more.",
  };

  return map[code] ?? null;
}

export async function handleApiError(error: unknown): Promise<void> {
  if (error instanceof ApiError) {
    const toast: Toast.Options = {
      style: Toast.Style.Failure,
      title: errorTitle(error.status, error.code),
      message: error.message,
    };

    if (error.status === 401) {
      if (getPreferences().apiToken) {
        toast.primaryAction = {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        };
      } else {
        const { clearDeviceToken } = await import("./device-token");
        await clearDeviceToken();
      }
    } else if (error.status === 402 || error.code === "usage.exceeded") {
      if (getPreferences().apiToken) {
        toast.primaryAction = {
          title: "Open Dashboard",
          onAction: async () => {
            const { open } = await import("@raycast/api");
            await open(getPreferences().instanceUrl);
          },
        };
      } else {
        toast.primaryAction = {
          title: "Add API Token",
          onAction: openExtensionPreferences,
        };
      }
    }

    await showToast(toast);
    return;
  }

  const message = error instanceof Error ? error.message : "Something went wrong";

  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message,
  });
}

function errorTitle(status: number, code?: string): string {
  if (code === "usage.exceeded" || status === 402) return "Out of Credits";
  if (status === 401) return "Authentication Failed";
  if (status === 429) return "Too Many Requests";
  if (code?.startsWith("content.")) return "Content Unavailable";
  if (code?.startsWith("url.")) return "Invalid URL";
  if (code?.startsWith("platform.")) return "Platform Error";
  return "Request Failed";
}

export async function fetchMetadata(url: string): Promise<MetadataResponse> {
  const meta = await fetchApi<MetadataResponse>(`/api/media/metadata?url=${encodeURIComponent(url)}`);

  await resolveImageUrls(meta);
  return meta;
}

export async function fetchStreams(url: string, quality?: string): Promise<StreamsResponse> {
  return fetchApi<StreamsResponse>("/api/media/streams", {
    method: "POST",
    body: JSON.stringify({ url, quality }),
  });
}

export async function fetchUsage(): Promise<UsageInfo> {
  return fetchApi<UsageInfo>("/api/usage/");
}

// Cache redirected thumbnails locally so Raycast can render them reliably.

const thumbDir = join(environment.supportPath, "thumbs");
const MAX_CACHE_FILES = 200;

const cachedPaths = new Map<string, string>();

export function getCachedImageUrl(url: string | null): string | null {
  if (!url) return null;
  return cachedPaths.get(url) ?? url;
}

function thumbCachePath(url: string): string {
  const hash = createHash("md5").update(url).digest("hex");
  return join(thumbDir, `${hash}.jpg`);
}

function pruneCache() {
  try {
    const files = readdirSync(thumbDir)
      .map((name) => {
        const p = join(thumbDir, name);
        return { path: p, mtime: statSync(p).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    for (const f of files.slice(MAX_CACHE_FILES)) {
      unlinkSync(f.path);
    }
  } catch {
    return;
  }
}

async function cacheImageUrl(url: string): Promise<void> {
  const cached = thumbCachePath(url);

  if (existsSync(cached)) {
    cachedPaths.set(url, cached);
    return;
  }

  try {
    if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });

    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return;

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(cached, buffer);

    cachedPaths.set(url, cached);
    pruneCache();
  } catch {
    return;
  }
}

async function resolveImageUrls(meta: MetadataResponse): Promise<void> {
  const cache = (url: string | null) => {
    if (url) return cacheImageUrl(url);
    return Promise.resolve();
  };

  const tasks: Promise<void>[] = [];

  tasks.push(cache(meta.thumbnailUrl));

  for (const item of meta.media) {
    if (item.type === "video") {
      tasks.push(cache(item.thumbnailUrl));
      if (item.musicInfo) tasks.push(cache(item.musicInfo.coverUrl));
    } else if (item.type === "audio") {
      tasks.push(cache(item.coverUrl));
      if (item.musicInfo) tasks.push(cache(item.musicInfo.coverUrl));
    } else if (item.type === "image") {
      tasks.push(cache(item.displayUrl));
    }
  }

  await Promise.all(tasks);
}
