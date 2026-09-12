import { XMLParser } from "fast-xml-parser";

import type { AudioPlaylist, MetadataItem, MusicAlbum, MusicArtist, MusicTrack, PlayQueueInfo } from "./types";

export type XmlNode = Record<string, unknown>;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

export function arrayify<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, token: string) => {
    const normalizedToken = token.toLowerCase();

    if (normalizedToken === "amp") {
      return "&";
    }

    if (normalizedToken === "lt") {
      return "<";
    }

    if (normalizedToken === "gt") {
      return ">";
    }

    if (normalizedToken === "quot") {
      return '"';
    }

    if (normalizedToken === "apos") {
      return "'";
    }

    if (normalizedToken === "nbsp") {
      return "\u00a0";
    }

    const codePoint = normalizedToken.startsWith("#x")
      ? Number.parseInt(normalizedToken.slice(2), 16)
      : normalizedToken.startsWith("#")
        ? Number.parseInt(normalizedToken.slice(1), 10)
        : Number.NaN;

    if (!Number.isFinite(codePoint)) {
      return entity;
    }

    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
}

export function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return decodeXmlEntities(String(value));
}

export function asNumber(value: unknown): number | undefined {
  const stringValue = asString(value);
  if (!stringValue) {
    return undefined;
  }

  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requiredString(value: unknown, field: string): string {
  const result = asString(value);
  if (!result) {
    throw new Error(`Missing required Plex field: ${field}`);
  }

  return result;
}

export function asBoolean(value: unknown): boolean {
  const stringValue = asString(value)?.toLowerCase();
  return stringValue === "1" || stringValue === "true";
}

export function buildMetadataKey(ratingKey: string): string {
  return `/library/metadata/${ratingKey}`;
}

function getArtworkPath(item: XmlNode): string | undefined {
  return (
    asString(item.thumb) ?? asString(item.parentThumb) ?? asString(item.grandparentThumb) ?? asString(item.composite)
  );
}

function getFirstNestedTag(item: XmlNode, key: string): string | undefined {
  const node = arrayify(item[key])[0];

  if (!node || typeof node !== "object") {
    return undefined;
  }

  return asString((node as XmlNode).tag);
}

function getPrimaryMediaNode(item: XmlNode): XmlNode | undefined {
  return firstObject(item.Media);
}

function getPrimaryPartNode(item: XmlNode): XmlNode | undefined {
  const mediaNode = getPrimaryMediaNode(item);
  return mediaNode ? firstObject(mediaNode.Part) : firstObject(item.Part);
}

function firstObject(values: unknown): XmlNode | undefined {
  return arrayify(values).find((node): node is XmlNode => typeof node === "object");
}

export function deduplicateByRatingKey<T extends { ratingKey: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.ratingKey)) {
      return false;
    }

    seen.add(item.ratingKey);
    return true;
  });
}

export function parseMediaContainer(xml: string): XmlNode {
  if (!xml.trim()) {
    return {};
  }

  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const container = parsed.MediaContainer ?? parsed.Response ?? parsed;

  if (!container || typeof container !== "object") {
    return {};
  }

  return container as XmlNode;
}

export function parseArtist(node: XmlNode): MusicArtist {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "artist",
    ratingKey,
    key: buildMetadataKey(ratingKey),
    browseKey: asString(node.key) ?? `${buildMetadataKey(ratingKey)}/children`,
    title: requiredString(node.title, "title"),
    summary: asString(node.summary),
    thumb: getArtworkPath(node),
  };
}

export function parseAlbum(node: XmlNode): MusicAlbum {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "album",
    ratingKey,
    key: buildMetadataKey(ratingKey),
    browseKey: asString(node.key) ?? `${buildMetadataKey(ratingKey)}/children`,
    title: requiredString(node.title, "title"),
    parentTitle: asString(node.parentTitle),
    year: asNumber(node.year),
    leafCount: asNumber(node.leafCount),
    duration: asNumber(node.duration),
    releaseType:
      asString(node.subtype) ??
      getFirstNestedTag(node, "Subformat") ??
      asString(node.subformat) ??
      getFirstNestedTag(node, "Format") ??
      asString(node.format) ??
      asString(node.albumType),
    releaseSubType: getFirstNestedTag(node, "Format") ?? asString(node.format) ?? asString(node.albumType),
    thumb: getArtworkPath(node),
  };
}

export function normalizeLibrarySectionKey(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  const match = normalized.match(/^\/library\/sections\/([^/]+)$/);
  return match?.[1] ?? normalized;
}

function getLibrarySectionKey(node: XmlNode): string | undefined {
  const explicitKey = normalizeLibrarySectionKey(asString(node.librarySectionKey));

  if (explicitKey) {
    return explicitKey;
  }

  return normalizeLibrarySectionKey(asString(node.librarySectionID));
}

export function parseTrack(node: XmlNode): MusicTrack {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");
  const librarySectionKey = normalizeLibrarySectionKey(
    asString(node.librarySectionKey) ?? asString(node.librarySectionID),
  );
  const mediaNode = getPrimaryMediaNode(node);
  const partNode = getPrimaryPartNode(node);

  return {
    type: "track",
    ratingKey,
    key: asString(node.key) ?? buildMetadataKey(ratingKey),
    title: requiredString(node.title, "title"),
    userRating: asNumber(node.userRating),
    parentRatingKey: asString(node.parentRatingKey),
    parentTitle: asString(node.parentTitle),
    grandparentRatingKey: asString(node.grandparentRatingKey),
    grandparentTitle: asString(node.grandparentTitle),
    librarySectionKey,
    audioFormat:
      asString(mediaNode?.audioCodec) ??
      asString(node.audioCodec) ??
      asString(mediaNode?.container) ??
      asString(partNode?.container) ??
      asString(node.container) ??
      getFirstNestedTag(node, "Format") ??
      asString(node.format),
    bitrate: asNumber(mediaNode?.bitrate) ?? asNumber(partNode?.bitrate) ?? asNumber(node.bitrate),
    duration: asNumber(node.duration),
    index: asNumber(node.index),
    parentIndex: asNumber(node.parentIndex),
    thumb: getArtworkPath(node),
    playQueueItemID: asString(node.playQueueItemID),
  };
}

export function parsePlaylist(node: XmlNode): AudioPlaylist {
  const ratingKey = requiredString(node.ratingKey, "ratingKey");

  return {
    type: "playlist",
    ratingKey,
    key: `/playlists/${ratingKey}`,
    browseKey: asString(node.key) ?? `/playlists/${ratingKey}/items`,
    title: requiredString(node.title, "title"),
    leafCount: asNumber(node.leafCount),
    librarySectionKey: getLibrarySectionKey(node),
    thumb: getArtworkPath(node),
  };
}

export function parseMetadataItem(container: XmlNode): MetadataItem | undefined {
  const metadata = arrayify(container.Metadata)[0];
  if (metadata && typeof metadata === "object") {
    const type = asString((metadata as XmlNode).type);

    if (type === "track") {
      return parseTrack(metadata as XmlNode);
    }

    if (type === "artist") {
      return parseArtist(metadata as XmlNode);
    }

    if (type === "album") {
      return parseAlbum(metadata as XmlNode);
    }
  }

  const track = arrayify(container.Track)[0];
  if (track && typeof track === "object") {
    return parseTrack(track as XmlNode);
  }

  const playlist = arrayify(container.Playlist)[0];
  if (playlist && typeof playlist === "object") {
    return parsePlaylist(playlist as XmlNode);
  }

  const directory = arrayify(container.Directory)[0];
  if (directory && typeof directory === "object") {
    const type = asString((directory as XmlNode).type);

    if (type === "artist") {
      return parseArtist(directory as XmlNode);
    }

    if (type === "album") {
      return parseAlbum(directory as XmlNode);
    }
  }

  return undefined;
}

export function parseMetadataNode(node: XmlNode): MetadataItem | undefined {
  const type = asString(node.type);

  if (type === "track") {
    return parseTrack(node);
  }

  if (type === "artist") {
    return parseArtist(node);
  }

  if (type === "album") {
    return parseAlbum(node);
  }

  if (type === "playlist") {
    return parsePlaylist(node);
  }

  if (asString(node.ratingKey) && asString(node.title)) {
    return parseTrack(node);
  }

  return undefined;
}

export function parsePlayQueue(container: XmlNode): PlayQueueInfo {
  const items = arrayify(container.Track)
    .filter((track): track is XmlNode => typeof track === "object")
    .map(parseTrack);
  const selectedItemID = asString(container.playQueueSelectedItemID);
  const selectedItem = items.find((item) => item.playQueueItemID === selectedItemID) ?? items[0];

  return {
    id: requiredString(container.playQueueID, "playQueueID"),
    version: asString(container.playQueueVersion),
    selectedItemID,
    selectedKey: selectedItem?.key,
    items,
  };
}
