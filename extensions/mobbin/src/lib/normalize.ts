import type { Platform, Screen } from "./types";

type ScreenLike = {
  id?: unknown;
  image_url?: unknown;
  imageUrl?: unknown;
  imageURL?: unknown;
  mobbin_url?: unknown;
  mobbinUrl?: unknown;
  url?: unknown;
  app_name?: unknown;
  appName?: unknown;
  app?: unknown;
  platform?: unknown;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asPlatform(value: unknown, fallback: Platform): Platform {
  return value === "ios" || value === "web" ? value : fallback;
}

function extractAppName(value: unknown): string | undefined {
  if (typeof value === "string") return asString(value);
  if (value && typeof value === "object") {
    const app = value as { name?: unknown; title?: unknown };
    return asString(app.name) ?? asString(app.title);
  }
  return undefined;
}

function normalizeScreen(value: unknown, fallbackPlatform: Platform, source: Screen["source"]): Screen | undefined {
  if (!value || typeof value !== "object") return undefined;

  const item = value as ScreenLike;
  const id = asString(item.id);
  const imageUrl = asString(item.image_url) ?? asString(item.imageUrl) ?? asString(item.imageURL);
  const mobbinUrl = asString(item.mobbin_url) ?? asString(item.mobbinUrl) ?? asString(item.url);
  const appName = asString(item.app_name) ?? asString(item.appName) ?? extractAppName(item.app);

  if (!id || !imageUrl || !mobbinUrl || !appName) return undefined;

  return {
    id,
    image_url: imageUrl,
    mobbin_url: mobbinUrl,
    app_name: appName,
    platform: asPlatform(item.platform, fallbackPlatform),
    source,
  };
}

export function normalizeScreens(value: unknown, fallbackPlatform: Platform, source: Screen["source"]): Screen[] {
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { screens?: unknown }).screens)
      ? (value as { screens: unknown[] }).screens
      : [];

  const seen = new Set<string>();
  return candidates.flatMap((candidate) => {
    const screen = normalizeScreen(candidate, fallbackPlatform, source);
    if (!screen || seen.has(screen.id)) return [];
    seen.add(screen.id);
    return [screen];
  });
}

export function findScreensInMcpResult(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const content = (value as { content?: unknown }).content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const typed = item as { type?: unknown; text?: unknown; json?: unknown; data?: unknown };
      if (typed.type === "text" && typeof typed.text === "string") {
        try {
          const parsed = JSON.parse(typed.text);
          if (parsed) return parsed;
        } catch {
          continue;
        }
      }
      if (typed.json) return typed.json;
      if (typed.data) return typed.data;
    }
  }

  const structured = (value as { structuredContent?: unknown }).structuredContent;
  return structured ?? value;
}
