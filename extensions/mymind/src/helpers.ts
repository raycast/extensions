import { Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { MyMindObject, Tag } from "./types";
import { getObjectDisplayTitle } from "./display-title";
import { getObjectKind } from "./object-kind";
import { isUserTag } from "./tag-utils";

const MYMIND_MEDIA_BASE_URL = "https://mymind.media";

function getMediaUrl(path?: string, url?: string): string | undefined {
  if (url) {
    return url;
  }

  if (!path) {
    return undefined;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${MYMIND_MEDIA_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getObjectUrl(item: MyMindObject): string | undefined {
  return item.url ?? item.source?.url;
}

export function getMymindObjectUrl(id: string): string {
  return `https://access.mymind.com/everything/#${id}`;
}

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function getObjectIcon(item: MyMindObject): Image.ImageLike {
  const kind = getObjectKind(item);

  if (kind === "image") {
    return Icon.Image;
  }

  if (kind === "video") {
    return Icon.Video;
  }

  if (kind === "pdf") {
    return Icon.Document;
  }

  if (kind === "note") {
    return Icon.Pencil;
  }

  const url = getObjectUrl(item);

  if (url) {
    return getFavicon(url, { fallback: Icon.Globe });
  }

  return Icon.Document;
}

export function getObjectImageUrl(item: MyMindObject): string | undefined {
  return getMediaUrl(item.blob?.path, item.blob?.url);
}

export function getObjectSubtitle(item: MyMindObject): string | undefined {
  const url = getObjectUrl(item);

  if (!url) {
    return undefined;
  }

  return getHostname(url) ?? url;
}

export function getObjectPreviewSource(
  item: MyMindObject,
  sources: {
    screenshotUrl?: string;
    thumbnailUrl?: string;
  },
): Image.ImageLike {
  return sources.thumbnailUrl ?? (hasSourceUrl(item) ? sources.screenshotUrl : undefined) ?? getObjectIcon(item);
}

export function isImageObject(item: MyMindObject): boolean {
  return Boolean(item.blob?.type?.startsWith("image/"));
}

export function hasSourceUrl(item: MyMindObject): boolean {
  return Boolean(getObjectUrl(item));
}

export function getObjectTypeLabel(item: MyMindObject): string {
  switch (getObjectKind(item)) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "note":
      return "Note";
    case "link":
      return "Link";
    default:
      return "Saved Item";
  }
}

export function getUserTagNames(item: MyMindObject, limit = 3): string[] {
  return item.tags
    .filter(isUserTag)
    .map((tag) => tag.name)
    .filter(Boolean)
    .slice(0, limit);
}

export function getObjectMarkdown(item: MyMindObject): string {
  const title = getObjectDisplayTitle(item);
  const sections = [`# ${title}`];
  const url = getObjectUrl(item);

  if (url) {
    sections.push(url);
  }

  if (item.summary) {
    sections.push(item.summary);
  }

  const body = typeof item.content?.body === "string" ? item.content.body.trim() : "";
  if (body) {
    sections.push(body);
  }

  const noteBodies = (item.notes ?? [])
    .map((note) => (typeof note.content?.body === "string" ? note.content.body.trim() : ""))
    .filter(Boolean);

  if (noteBodies.length > 0) {
    sections.push(["## Notes", ...noteBodies].join("\n\n"));
  }

  return sections.join("\n\n");
}

export function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
