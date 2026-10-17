export interface LibrarySection {
  key: string;
  title: string;
  type: "artist";
  totalSize?: number;
}

export interface MusicArtist {
  type: "artist";
  ratingKey: string;
  key: string;
  browseKey: string;
  title: string;
  summary?: string;
  thumb?: string;
}

export interface MusicAlbum {
  type: "album";
  ratingKey: string;
  key: string;
  browseKey: string;
  title: string;
  parentTitle?: string;
  year?: number;
  leafCount?: number;
  duration?: number;
  releaseType?: string;
  releaseSubType?: string;
  thumb?: string;
}

export interface MusicTrack {
  type: "track";
  ratingKey: string;
  key: string;
  title: string;
  userRating?: number;
  parentRatingKey?: string;
  parentTitle?: string;
  grandparentRatingKey?: string;
  grandparentTitle?: string;
  librarySectionKey?: string;
  audioFormat?: string;
  bitrate?: number;
  duration?: number;
  index?: number;
  parentIndex?: number;
  thumb?: string;
  playQueueItemID?: string;
}

export interface AudioPlaylist {
  type: "playlist";
  ratingKey: string;
  key: string;
  browseKey: string;
  title: string;
  leafCount?: number;
  librarySectionKey?: string;
  thumb?: string;
}

export interface TimelineInfo {
  state: string;
  key?: string;
  ratingKey?: string;
  current?: MetadataItem;
  machineIdentifier?: string;
  address?: string;
  port?: string;
  protocol?: string;
  time?: number;
  duration?: number;
  playQueueID?: string;
  playQueueItemID?: string;
  volume?: number;
  repeat?: string;
  shuffle?: string;
}

export interface PlayQueueInfo {
  id: string;
  version?: string;
  selectedItemID?: string;
  selectedKey?: string;
  items: MusicTrack[];
}

export interface SearchResults {
  tracks: MusicTrack[];
  albums: MusicAlbum[];
  artists: MusicArtist[];
  playlists: AudioPlaylist[];
}

export interface PlexampClientInfo {
  name: string;
  product?: string;
  version?: string;
  platform?: string;
  platformVersion?: string;
  deviceName?: string;
  machineIdentifier?: string;
  address?: string;
  port?: string;
  protocol?: string;
}

export interface LibraryStats {
  artists?: number;
  albums?: number;
  tracks?: number;
}

export interface PlexServerConnection {
  uri: string;
  address?: string;
  port?: string;
  protocol?: string;
  local?: boolean;
  localNetwork?: boolean;
  relay?: boolean;
}

export interface PlexServerResource {
  name: string;
  product?: string;
  productVersion?: string;
  platform?: string;
  clientIdentifier: string;
  accessToken?: string;
  sourceTitle?: string;
  owned: boolean;
  connections: PlexServerConnection[];
  preferredConnection?: PlexServerConnection;
}

export interface PlexAuthPin {
  id: string;
  code: string;
  authUrl: string;
  expiresIn?: number;
}

export interface PlexSetupStatus {
  plexampUrl: string;
  hasSavedToken: boolean;
  hasEffectiveToken: boolean;
  hasEffectiveServer: boolean;
  selectedServerName?: string;
  selectedLibrary?: string;
}

export type PlayableItem = MusicArtist | MusicAlbum | MusicTrack | AudioPlaylist;
export type MetadataItem = MusicArtist | MusicAlbum | MusicTrack | AudioPlaylist;
