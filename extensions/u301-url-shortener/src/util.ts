import { getPreferenceValues } from "@raycast/api";
import type { ShortenOptions } from "u301";
import { AI, environment } from "@raycast/api";

export function isValidURL(string: string) {
  const regex = new RegExp(
    /(http(s)?:\/\/.)(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
  );
  return string.match(regex);
}

export function uniqueArray(items?: string[]): string[] {
  if (!items) {
    return [];
  }
  return Array.from(new Set(items));
}

export async function shortenURL(options: ShortenOptions) {
  const preferences = getPreferenceValues();
  const workspaceId = preferences.workspaceId;
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (preferences.accessToken) {
    headers.append("Authorization", `Bearer ${preferences.accessToken}`);
  }
  let URL = `https://api.u301.com/v3/shorten?returnExisting=1`;
  if (workspaceId) {
    URL += `&workspaceId=${encodeURIComponent(workspaceId)}`;
  }
  URL += `&url=${encodeURIComponent(options.url)}`;
  if (preferences.domainName) {
    URL += `&domain=${encodeURIComponent(preferences.domainName)}`;
  }
  if (!options.slug && environment.canAccess(AI) && preferences.generateShortKeyByAI) {
    const generatedSlug = await AI.ask(
      `Generate a key for ${options.url} for shorten URL. The key should be meaningful and easy to remember, only contain letters and numbers, prefer lowercase and can't be too long. Output ONLY the key itself, nothing else.`,
    );
    console.log(generatedSlug);
    if (generatedSlug.match(/^[a-zA-Z0-9_-]+$/)) {
      URL += `&slug=${encodeURIComponent(generatedSlug)}`;
    }
  }
  if (options.slug) {
    URL += `&slug=${encodeURIComponent(options.slug)}`;
  }
  if (options.comment) {
    URL += `&comment=${encodeURIComponent(options.comment)}`;
  }
  const res = await fetch(URL, {
    headers,
  });
  const result = await res.json();
  console.log(result);
  if (!res.ok) {
    throw new Error((result as { message?: string }).message);
  }
  /**
   * {
    "id": "01988412-f867-7573-9672-98539ab56560",
    "code": "BA9X",
    "slug": "BA9X",
    "domain": "u301.co",
    "urlPrefix": "https://u301.co",
    "status": "public",
    "url": "https://example.com",
    "shortened": "https://u301.co/BA9X"
}
   */
  if (isValidResult(result)) {
    return result.shortened;
  } else {
    throw new Error("Failed to shorten URL, unexpected response");
  }
}

interface ShortenResult {
  id: string;
  code: string;
  slug: string;
  domain: string;
  urlPrefix: string;
  status: string;
  url: string;
  shortened: string;
}

function isValidResult(result: unknown): result is ShortenResult {
  return typeof result === "object" && result !== null && typeof (result as ShortenResult).shortened === "string";
}
