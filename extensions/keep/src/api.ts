import { getPreferenceValues } from "@raycast/api";
import type {
  KeepDeleteResponse,
  KeepIngestResponse,
  KeepItem,
  KeepItemsResponse,
  KeepPreferences,
  LinkFilter,
} from "./types";

const DEFAULT_BASE_URL = "https://keep.md";
const FRONTMATTER_PATTERN = /^\uFEFF?---\s*\n[\s\S]*?\n---\s*(?:\n|$)/;
const FRONTMATTER_IMAGE_KEYS = [
  "image",
  "cover",
  "coverImage",
  "thumbnail",
  "thumbnailUrl",
  "og:image",
  "twitter:image",
] as const;

const getPreferences = () => getPreferenceValues<KeepPreferences>();

const normalizeBaseUrl = (input?: string) => {
  const value = input?.trim() || DEFAULT_BASE_URL;
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api")
    ? withoutTrailingSlash.slice(0, -4)
    : withoutTrailingSlash;
};

const buildUrl = (
  path: string,
  params?: Record<string, string | number | undefined>,
) => {
  const { baseUrl } = getPreferences();
  const url = new URL(path, normalizeBaseUrl(baseUrl));

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url;
};

const readApiError = async (response: Response) => {
  const body = await response.json().catch(() => null);

  if (body && typeof body === "object") {
    const error =
      "message" in body && typeof body.message === "string"
        ? body.message
        : "error" in body && typeof body.error === "string"
          ? body.error
          : null;
    if (error) return error;
  }

  const fallback = await response.text().catch(() => "");
  return fallback || `Request failed (${response.status})`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const { apiKey } = getPreferences();
  const response = await fetch(buildUrl(path).toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const normalizeUrlInput = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "just now";
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export const getItemHost = (item: KeepItem) => {
  try {
    return new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    return item.url;
  }
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeImageUrl = (value: unknown, pageUrl: string) => {
  if (!isNonEmptyString(value)) return undefined;

  const trimmed = value.trim();
  const candidate =
    trimmed.startsWith("//") ||
    /^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#]|$)/i.test(trimmed)
      ? `https:${trimmed.startsWith("//") ? "" : "//"}${trimmed}`
      : trimmed;

  try {
    return new URL(candidate, pageUrl).toString();
  } catch {
    return undefined;
  }
};

const stripFrontmatter = (markdown?: string) => {
  if (!markdown) return "";
  return markdown.replace(/\r/g, "").replace(FRONTMATTER_PATTERN, "").trim();
};

const getItemLeadImage = (item: KeepItem) => {
  const lead = item.content?.meta?.lead;
  const leadUrl =
    lead?.kind === "image" ? normalizeImageUrl(lead.url, item.url) : undefined;
  if (lead && leadUrl) {
    return {
      url: leadUrl,
      alt: isNonEmptyString(lead.alt)
        ? lead.alt.trim()
        : item.title || "Preview image",
    };
  }

  const frontmatter = item.content?.meta?.frontmatter;
  if (!frontmatter) return undefined;

  for (const key of FRONTMATTER_IMAGE_KEYS) {
    const resolvedUrl = normalizeImageUrl(frontmatter[key], item.url);
    if (resolvedUrl) {
      return {
        url: resolvedUrl,
        alt: item.title || "Preview image",
      };
    }
  }

  return undefined;
};

const escapeMarkdownAlt = (value: string) =>
  value.replaceAll("[", "").replaceAll("]", "");

const markdownIncludesImageUrl = (
  markdown: string,
  imageUrl: string,
  pageUrl: string,
) => {
  const normalizedTarget = normalizeImageUrl(imageUrl, pageUrl);
  if (!normalizedTarget) return false;

  const markdownImagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const htmlImagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

  for (const match of markdown.matchAll(markdownImagePattern)) {
    if (normalizeImageUrl(match[1], pageUrl) === normalizedTarget) {
      return true;
    }
  }

  for (const match of markdown.matchAll(htmlImagePattern)) {
    if (normalizeImageUrl(match[1], pageUrl) === normalizedTarget) {
      return true;
    }
  }

  return false;
};

export const buildItemMarkdown = (item: KeepItem) => {
  const parts: string[] = [];
  const contentMarkdown = stripFrontmatter(item.contentMarkdown);
  const leadImage = getItemLeadImage(item);

  if (
    leadImage &&
    !markdownIncludesImageUrl(contentMarkdown, leadImage.url, item.url)
  ) {
    parts.push(`![${escapeMarkdownAlt(leadImage.alt)}](${leadImage.url})`);
  }

  if (contentMarkdown) {
    parts.push(contentMarkdown);
  } else if (item.notes?.trim()) {
    parts.push(item.notes.trim());
  }

  parts.push(`[Open original](${item.url})`);

  return parts.join("\n\n");
};

export const fetchLinks = async (params: {
  filter: LinkFilter;
  search?: string;
  limit?: number;
}): Promise<KeepItemsResponse> => {
  const limit = params.limit ?? 100;
  const search = params.search?.trim();

  if (params.filter === "unread") {
    return request<KeepItemsResponse>(
      buildUrl("/api/feed", {
        limit,
        q: search || undefined,
      }).toString(),
    );
  }

  const path = search ? "/api/items/search" : "/api/items";
  const response = await request<KeepItemsResponse>(
    buildUrl(path, {
      limit,
      include: "content",
      q: search || undefined,
    }).toString(),
  );

  if (params.filter === "all") {
    return response;
  }

  const items = response.items.filter((item) => Boolean(item.processedAt));
  return {
    ...response,
    items,
    count: items.length,
  };
};

export const fetchUnreadSummary = async (limit = 5) =>
  request<KeepItemsResponse>(buildUrl("/api/feed", { limit }).toString());

export const saveLink = async (params: {
  url: string;
  title?: string;
  source: string;
}) => {
  const normalizedUrl = normalizeUrlInput(params.url);
  const result = await request<KeepIngestResponse>("/api/ingest", {
    method: "POST",
    body: JSON.stringify({
      url: normalizedUrl,
      source: params.source,
      fallbackTitle: params.title?.trim() || undefined,
    }),
  });

  if (params.title?.trim()) {
    await updateItem(result.id, { title: params.title.trim() });
  }

  return {
    ...result,
    added: Boolean(result.sync?.added),
    normalizedUrl,
  };
};

export const updateItem = async (
  id: string,
  payload: {
    title?: string;
    processed?: boolean;
  },
) =>
  request<KeepItem>(`/api/items/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteItem = async (id: string) =>
  request<KeepDeleteResponse>("/api/items/delete", {
    method: "POST",
    body: JSON.stringify({ ids: [id] }),
  });
