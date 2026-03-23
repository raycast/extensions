import { getConfig, getConfiguredPlexampUrl, registerConfigInvalidator, requireServerConfig } from "./plex-config";
import {
  arrayify,
  asNumber,
  asString,
  buildMetadataKey,
  deduplicateByRatingKey,
  normalizeLibrarySectionKey,
  parseAlbum,
  parseArtist,
  parseMetadataItem,
  parsePlaylist,
  parseTrack,
  requiredString,
  type XmlNode,
} from "./plex-parsing";
import { getTimelineServerBaseUrl, requestServer, requestServerWithConnection, requestXml } from "./plex-request";
import type {
  AudioPlaylist,
  LibrarySection,
  LibraryStats,
  MetadataItem,
  MusicAlbum,
  MusicArtist,
  MusicTrack,
  PlexServerResource,
  PlexampClientInfo,
  SearchResults,
  TimelineInfo,
} from "./types";

let playlistLibrarySectionCache = new Map<string, string | null>();

registerConfigInvalidator(() => {
  playlistLibrarySectionCache = new Map<string, string | null>();
});

async function hydrateAlbums(albums: MusicAlbum[]): Promise<MusicAlbum[]> {
  const hydratedAlbums: MusicAlbum[] = [];

  for (let index = 0; index < albums.length; index += 6) {
    const batch = albums.slice(index, index + 6);
    const results = await Promise.allSettled(
      batch.map(async (album) => {
        let hydratedAlbum = album;

        if (album.leafCount === undefined || album.duration === undefined || album.releaseType === undefined) {
          const metadata = await getMetadataByKey(buildMetadataKey(album.ratingKey));

          if (metadata?.type === "album") {
            hydratedAlbum = metadata;
          }
        }

        return hydratedAlbum;
      }),
    );

    hydratedAlbums.push(
      ...results.map((result, offset) => (result.status === "fulfilled" ? result.value : batch[offset])),
    );
  }

  return hydratedAlbums;
}

function parsePlexampClientInfo(container: XmlNode): PlexampClientInfo {
  const baseUrl = new URL(getConfiguredPlexampUrl());
  const node =
    arrayify(container.Player).find((item): item is XmlNode => typeof item === "object") ??
    arrayify(container.Device).find((item): item is XmlNode => typeof item === "object") ??
    arrayify(container.Server).find((item): item is XmlNode => typeof item === "object") ??
    container;

  return {
    name: asString(node.title) ?? asString(node.name) ?? asString(node.deviceName) ?? "Plexamp",
    product: asString(node.product),
    version: asString(node.version),
    platform: asString(node.platform),
    platformVersion: asString(node.platformVersion),
    deviceName: asString(node.deviceName) ?? asString(node.device) ?? asString(node.name),
    machineIdentifier: asString(node.machineIdentifier) ?? asString(node.clientIdentifier),
    address: asString(node.address) ?? baseUrl.hostname,
    port: asString(node.port) ?? (baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80")),
    protocol: asString(node.protocol) ?? baseUrl.protocol.replace(":", ""),
  };
}

function parseMusicSections(container: XmlNode): LibrarySection[] {
  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .filter((node) => asString(node.type) === "artist")
    .map((node) => ({
      key: requiredString(node.key, "key"),
      title: requiredString(node.title, "title"),
      type: "artist" as const,
      totalSize: asNumber(node.totalSize),
    }));
}

export async function getMusicSectionsForServer(server: PlexServerResource): Promise<LibrarySection[]> {
  const candidates = server.connections.length > 0 ? server.connections : server.preferredConnection ? [server.preferredConnection] : [];

  if (candidates.length === 0) {
    throw new Error(`No usable connection was found for ${server.name}.`);
  }

  const container = await Promise.any(
    candidates.map((connection) => requestXml(connection.uri, "/library/sections", undefined, true, server.accessToken)),
  );

  return parseMusicSections(container);
}

export async function getMusicSections(): Promise<LibrarySection[]> {
  const config = await requireServerConfig();

  return getMusicSectionsForServer({
    name: config.serverName ?? "Plex Media Server",
    clientIdentifier: config.serverMachineIdentifier ?? config.plexServerUrl,
    accessToken: config.plexServerToken ?? config.plexToken,
    owned: true,
    connections: [{ uri: config.plexServerUrl }],
    preferredConnection: { uri: config.plexServerUrl },
  });
}

export async function resolveSelectedLibrary(libraries: LibrarySection[]): Promise<LibrarySection | undefined> {
  const { musicLibrary } = await getConfig();

  if (libraries.length === 0) {
    return undefined;
  }

  if (libraries.length === 1) {
    return libraries[0];
  }

  if (!musicLibrary) {
    return undefined;
  }

  const normalizedTarget = musicLibrary.toLowerCase();
  const selected = libraries.find((library) => {
    return library.key === musicLibrary || library.title.toLowerCase() === normalizedTarget;
  });

  if (!selected) {
    throw new Error(
      `Saved library selection "${musicLibrary}" was not found. Choose a different music library during setup.`,
    );
  }

  return selected;
}

export async function getSelectedLibrary(): Promise<LibrarySection | undefined> {
  const libraries = await getMusicSections();
  return resolveSelectedLibrary(libraries);
}

export async function getPlexampClientInfo(): Promise<PlexampClientInfo> {
  const config = await getConfig();
  const container = await requestXml(config.plexampUrl, "/resources", undefined, false, config.plexToken);
  return parsePlexampClientInfo(container);
}

export async function getLibraryStats(sectionKey: string): Promise<LibraryStats> {
  const [artistsContainer, albumsContainer, tracksContainer] = await Promise.all([
    requestServer(`/library/sections/${sectionKey}/all?type=8&X-Plex-Container-Start=0&X-Plex-Container-Size=1`),
    requestServer(`/library/sections/${sectionKey}/all?type=9&X-Plex-Container-Start=0&X-Plex-Container-Size=1`),
    requestServer(`/library/sections/${sectionKey}/all?type=10&X-Plex-Container-Start=0&X-Plex-Container-Size=1`),
  ]);

  return {
    artists: asNumber(artistsContainer.totalSize) ?? asNumber(artistsContainer.size),
    albums: asNumber(albumsContainer.totalSize) ?? asNumber(albumsContainer.size),
    tracks: asNumber(tracksContainer.totalSize) ?? asNumber(tracksContainer.size),
  };
}

export async function getAudioPlaylists(sectionKey: string): Promise<AudioPlaylist[]> {
  const config = await requireServerConfig();
  const container = await requestServer("/playlists?type=15&playlistType=audio");
  const normalizedSectionKey = normalizeLibrarySectionKey(sectionKey);
  const cacheNamespace = config.serverMachineIdentifier ?? config.plexServerUrl;
  const playlists = deduplicateByRatingKey([
    ...arrayify(container.Playlist)
      .filter((node): node is XmlNode => typeof node === "object")
      .map(parsePlaylist),
    ...arrayify(container.Metadata)
      .filter((node): node is XmlNode => typeof node === "object" && asString((node as XmlNode).type) === "playlist")
      .map(parsePlaylist),
  ]);

  const sectionKeys = new Map<string, string | undefined>();

  for (let index = 0; index < playlists.length; index += 6) {
    const batch = playlists.slice(index, index + 6);
    const resolvedKeys = await Promise.all(
      batch.map((playlist) => resolvePlaylistLibrarySectionKey(playlist, cacheNamespace)),
    );

    for (const [offset, resolvedKey] of resolvedKeys.entries()) {
      sectionKeys.set(batch[offset].ratingKey, resolvedKey);
    }
  }

  return playlists.filter((playlist) => sectionKeys.get(playlist.ratingKey) === normalizedSectionKey);
}

async function resolvePlaylistLibrarySectionKey(
  playlist: AudioPlaylist,
  cacheNamespace: string,
): Promise<string | undefined> {
  const explicitSectionKey = normalizeLibrarySectionKey(playlist.librarySectionKey);

  if (explicitSectionKey) {
    return explicitSectionKey;
  }

  const cacheKey = `${cacheNamespace}:${playlist.ratingKey}`;
  const cachedSectionKey = playlistLibrarySectionCache.get(cacheKey);

  if (cachedSectionKey !== undefined) {
    return cachedSectionKey ?? undefined;
  }

  try {
    const metadata = await getMetadataByKey(playlist.key);

    if (metadata?.type === "playlist") {
      const metadataSectionKey = normalizeLibrarySectionKey(metadata.librarySectionKey);

      if (metadataSectionKey) {
        playlistLibrarySectionCache.set(cacheKey, metadataSectionKey);
        return metadataSectionKey;
      }
    }

    const tracks = await getTracksForPlaylist(playlist);
    const sectionKeys = new Set(
      tracks
        .map((track) => normalizeLibrarySectionKey(track.librarySectionKey))
        .filter((key): key is string => Boolean(key)),
    );
    const resolvedSectionKey = sectionKeys.size === 1 ? [...sectionKeys][0] : undefined;

    playlistLibrarySectionCache.set(cacheKey, resolvedSectionKey ?? null);
    return resolvedSectionKey;
  } catch {
    playlistLibrarySectionCache.set(cacheKey, null);
    return undefined;
  }
}

export async function getArtists(sectionKey: string): Promise<MusicArtist[]> {
  const container = await requestServer(`/library/sections/${sectionKey}/all?type=8&sort=titleSort:asc`);

  return arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseArtist);
}

export async function searchLibrary(sectionKey: string, query: string): Promise<SearchResults> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { tracks: [], albums: [], artists: [], playlists: [] };
  }

  const container = await requestServer(
    `/hubs/search?query=${encodeURIComponent(trimmedQuery)}&sectionId=${encodeURIComponent(sectionKey)}&limit=30&includeCollections=1&includeExternalMedia=0`,
  );
  const hubs = arrayify(container.Hub).filter((node): node is XmlNode => typeof node === "object");
  const tracks = hubs.flatMap((hub) =>
    arrayify(hub.Track)
      .filter((node): node is XmlNode => typeof node === "object")
      .map(parseTrack),
  );
  const directories = hubs.flatMap((hub) =>
    arrayify(hub.Directory).filter((node): node is XmlNode => typeof node === "object"),
  );
  const metadata = hubs.flatMap((hub) =>
    arrayify(hub.Metadata).filter((node): node is XmlNode => typeof node === "object"),
  );
  const albums = [
    ...directories.filter((node) => asString(node.type) === "album").map(parseAlbum),
    ...metadata.filter((node) => asString(node.type) === "album").map(parseAlbum),
  ];
  const artists = [
    ...directories.filter((node) => asString(node.type) === "artist").map(parseArtist),
    ...metadata.filter((node) => asString(node.type) === "artist").map(parseArtist),
  ];
  const hydratedAlbums = await hydrateAlbums(deduplicateByRatingKey(albums));

  return {
    tracks: deduplicateByRatingKey(tracks),
    albums: hydratedAlbums,
    artists: deduplicateByRatingKey(artists),
    playlists: [],
  };
}

export async function getAlbumsForArtist(sectionKey: string, artist: MusicArtist): Promise<MusicAlbum[]> {
  const container = await requestServer(
    `/library/sections/${sectionKey}/all?type=9&artist.id=${encodeURIComponent(artist.ratingKey)}`,
  );
  const albums = arrayify(container.Directory)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseAlbum);

  return hydrateAlbums(albums);
}

export async function getTracksForAlbum(album: MusicAlbum): Promise<MusicTrack[]> {
  const container = await requestServer(album.browseKey);

  return arrayify(container.Track)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseTrack);
}

export async function getTracksForPlaylist(playlist: AudioPlaylist): Promise<MusicTrack[]> {
  const container = await requestServer(playlist.browseKey);

  return arrayify(container.Track)
    .filter((node): node is XmlNode => typeof node === "object")
    .map(parseTrack);
}

export async function getMetadataByKey(key: string): Promise<MetadataItem | undefined> {
  const container = await requestServer(key);
  return parseMetadataItem(container);
}

export async function getMetadataByKeyForTimeline(
  timeline: TimelineInfo,
  key: string,
): Promise<MetadataItem | undefined> {
  const baseUrl = getTimelineServerBaseUrl(timeline);

  if (!baseUrl) {
    return getMetadataByKey(key);
  }

  const { plexToken } = await getConfig();
  const container = await requestServerWithConnection(baseUrl, key, plexToken);
  return parseMetadataItem(container);
}

export async function getMetadataByRatingKey(ratingKey: string): Promise<MetadataItem | undefined> {
  return getMetadataByKey(buildMetadataKey(ratingKey));
}
