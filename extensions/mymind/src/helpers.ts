import { Color, Icon, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { MyMindObject, Space } from "./types";
import { getObjectDisplayTitle } from "./display-title";
import { getObjectUrl } from "./object-info";
import { getObjectKind } from "./object-kind";
import { isUserTag } from "./tag-utils";

export { getObjectSubtitle, getObjectTypeLabel, getObjectUrl } from "./object-info";

const MYMIND_MEDIA_BASE_URL = "https://mymind.media";
const EMPTY_GRID_TILE_COLOR = "rgba(0, 0, 0, 0)";

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

export function getMymindObjectUrl(id: string): string {
  return `https://access.mymind.com/everything/#${id}`;
}

export function getMymindSpaceUrl(id: string): string {
  return `https://access.mymind.com/spaces/${id}`;
}

export function isSupportedColor(value?: string): value is string {
  if (!value) {
    return false;
  }

  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim());
}

export function getSpaceIcon(space: Space) {
  return {
    source: Icon.Circle,
    tintColor: isSupportedColor(space.color) ? space.color : Color.SecondaryText,
  };
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

export function getObjectPreviewSource(
  item: MyMindObject,
  sources: {
    screenshotUrl?: string;
    thumbnailUrl?: string;
  },
): Image.ImageLike | { color: string } {
  const previewSource = sources.thumbnailUrl ?? (hasSourceUrl(item) ? sources.screenshotUrl : undefined);

  if (previewSource) {
    return previewSource;
  }

  const kind = getObjectKind(item);

  if (kind === "image" || kind === "video" || kind === "pdf") {
    return { color: EMPTY_GRID_TILE_COLOR };
  }

  return getObjectIcon(item);
}

export function getObjectListIcon(
  item: MyMindObject,
  sources: {
    screenshotUrl?: string;
    thumbnailUrl?: string;
  },
): Image.ImageLike {
  const kind = getObjectKind(item);

  if (kind === "image" || kind === "video" || kind === "pdf") {
    return sources.thumbnailUrl ?? sources.screenshotUrl ?? getObjectIcon(item);
  }

  if (kind === "note") {
    return "empty-thumbnail.svg";
  }

  return getObjectIcon(item);
}

export function isImageObject(item: MyMindObject): boolean {
  return Boolean(item.blob?.type?.startsWith("image/"));
}

export function hasSourceUrl(item: MyMindObject): boolean {
  return Boolean(getObjectUrl(item));
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
