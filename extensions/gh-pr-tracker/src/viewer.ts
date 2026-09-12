import { LocalStorage } from "@raycast/api";
import { getConfig } from "./api";
import { apiLog as log, getErrorMessage } from "./logger";

const STORAGE_KEY = "gh_pr_viewer_login";

interface CachedViewer {
  login: string;
  cachedAt: number;
}

async function readCache(): Promise<string | undefined> {
  let raw: string | undefined;
  try {
    raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  } catch (error) {
    log.warn("Failed to read viewer login cache", { error: getErrorMessage(error) });
    return undefined;
  }

  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedViewer>;
    return typeof parsed.login === "string" ? parsed.login : undefined;
  } catch (error) {
    log.warn("Viewer login cache is corrupt — ignoring", { error: getErrorMessage(error) });
    return undefined;
  }
}

async function writeCache(login: string): Promise<void> {
  const entry: CachedViewer = { login, cachedAt: Date.now() };
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    log.warn("Failed to cache viewer login", { error: getErrorMessage(error) });
  }
}

/**
 * Resolves authenticated GitHub user's login, for `@me` shorthand. Cached indefinitely after
 * first successful lookup — PAT owner does not change, so there is no freshness window to expire.
 * Returns `undefined` on any failure so `@me` filters just stop matching instead of breaking fetch.
 */
export async function getViewerLogin(): Promise<string | undefined> {
  const cached = await readCache();
  if (cached) return cached;

  try {
    const { base, headers } = getConfig();
    const res = await fetch(`${base}/user`, { headers });
    if (!res.ok) {
      log.warn("Could not resolve viewer login for @me — request failed", { status: res.status });
      return undefined;
    }
    const body = (await res.json()) as { login?: unknown };
    if (typeof body.login !== "string" || body.login.length === 0) return undefined;
    await writeCache(body.login);
    return body.login;
  } catch (error) {
    log.warn("Could not resolve viewer login for @me", { error: getErrorMessage(error) });
    return undefined;
  }
}
