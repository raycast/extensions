/**
 * Spotify Web API with fixes and improvements from sonallux
 * 2023.2.27
 * DO NOT MODIFY - This file has been generated using oazapfts.
 * See https://www.npmjs.com/package/oazapfts
 */
/* eslint @typescript-eslint/ban-ts-comment: off, @typescript-eslint/no-explicit-any: off */
// @ts-nocheck
import * as Oazapfts from "oazapfts/lib/runtime";
import * as QS from "oazapfts/lib/runtime/query";
export const defaults: Oazapfts.RequestOpts = {
  baseUrl: "https://api.spotify.com/v1",
};
const oazapfts = Oazapfts.runtime(defaults);
export const servers = {
  server1: "https://api.spotify.com/v1",
};
export type ExternalUrlObject = {
  spotify?: string;
};
export type ImageObject = {
  url: string;
  height: number | null;
  width: number | null;
};
export type AlbumRestrictionObject = {
  reason?: "market" | "product" | "explicit";
};
export type AlbumBase = {
  album_type: "album" | "single" | "compilation";
  total_tracks: number;
  available_markets: string[];
  external_urls: ExternalUrlObject;
  href: string;
  id: string;
  images: ImageObject[];
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  restrictions?: AlbumRestrictionObject;
  type: "album";
  uri: string;
};
export type SimplifiedArtistObject = {
  external_urls?: ExternalUrlObject;
  href?: string;
  id?: string;
  name?: string;
  type?: "artist";
  uri?: string;
};
export type PagingObject = {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
};
export type SimplifiedAlbumObject = AlbumBase & {
  album_group?: "album" | "single" | "compilation" | "appears_on";
  artists: SimplifiedArtistObject[];
};
export type LinkedTrackObject = {
  external_urls?: ExternalUrlObject;
  href?: string;
  id?: string;
  type?: string;
  uri?: string;
};
export type TrackRestrictionObject = {
  reason?: string;
};
export type SimplifiedTrackObject = {
  album?: SimplifiedAlbumObject;
  artists?: SimplifiedArtistObject[];
  available_markets?: string[];
  disc_number?: number;
  duration_ms?: number;
  explicit?: boolean;
  external_urls?: ExternalUrlObject;
  href?: string;
  id?: string;
  is_playable?: boolean;
  linked_from?: LinkedTrackObject;
  restrictions?: TrackRestrictionObject;
  name?: string;
  preview_url?: string;
  track_number?: number;
  type?: string;
  uri?: string;
  is_local?: boolean;
};
export type PagingSimplifiedTrackObject = PagingObject & {
  items?: SimplifiedTrackObject[];
};
export type ExternalIdObject = {
  isrc?: string;
  ean?: string;
  upc?: string;
};
export type CopyrightObject = {
  text?: string;
  type?: string;
};
export type AlbumObject = AlbumBase & {
  artists?: SimplifiedArtistObject[];
  tracks?: PagingSimplifiedTrackObject;
  popularity?: number;
  label?: string;
  external_ids?: ExternalIdObject;
  genres?: string[];
  copyrights?: CopyrightObject[];
};
export type ErrorObject = {
  status: number;
  message: string;
};
export type FollowersObject = {
  href?: string | null;
  total?: number;
};
export type ArtistObject = {
  external_urls?: ExternalUrlObject;
  followers?: FollowersObject;
  genres?: string[];
  href?: string;
  id?: string;
  images?: ImageObject[];
  name?: string;
  popularity?: number;
  type?: "artist";
  uri?: string;
};
export type PagingSimplifiedAlbumObject = PagingObject & {
  items?: SimplifiedAlbumObject[];
};
export type TrackObject = {
  album?: SimplifiedAlbumObject;
  artists?: ArtistObject[];
  available_markets?: string[];
  disc_number?: number;
  duration_ms?: number;
  explicit?: boolean;
  external_ids?: ExternalIdObject;
  external_urls?: ExternalUrlObject;
  href?: string;
  id?: string;
  is_playable?: boolean;
  linked_from?: LinkedTrackObject;
  restrictions?: TrackRestrictionObject;
  name?: string;
  popularity?: number;
  preview_url?: string;
  track_number?: number;
  type?: "track";
  uri?: string;
  is_local?: boolean;
};
export type ShowBase = {
  available_markets: string[];
  copyrights: CopyrightObject[];
  description: string;
  html_description: string;
  explicit: boolean;
  external_urls: ExternalUrlObject;
  href: string;
  id: string;
  images: ImageObject[];
  is_externally_hosted: boolean;
  languages: string[];
  media_type: string;
  name: string;
  publisher: string;
  type: "show";
  uri: string;
  total_episodes: number;
};
export type ResumePointObject = {
  fully_played?: boolean;
  resume_position_ms?: number;
};
export type EpisodeRestrictionObject = {
  reason?: string;
};
export type EpisodeBase = {
  audio_preview_url: string;
  description: string;
  html_description: string;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrlObject;
  href: string;
  id: string;
  images: ImageObject[];
  is_externally_hosted: boolean;
  is_playable: boolean;
  language?: string;
  languages: string[];
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  resume_point: ResumePointObject;
  type: "episode";
  uri: string;
  restrictions?: EpisodeRestrictionObject;
};
export type SimplifiedEpisodeObject = EpisodeBase;
export type PagingSimplifiedEpisodeObject = PagingObject & {
  items?: SimplifiedEpisodeObject[];
};
export type ShowObject = ShowBase & {
  episodes: PagingSimplifiedEpisodeObject;
};
export type SimplifiedShowObject = ShowBase;
export type EpisodeObject = EpisodeBase & {
  show: SimplifiedShowObject;
};
export type AuthorObject = {
  name?: string;
};
export type NarratorObject = {
  name?: string;
};
export type AudiobookBase = {
  authors: AuthorObject[];
  available_markets: string[];
  copyrights: CopyrightObject[];
  description: string;
  html_description: string;
  edition?: string;
  explicit: boolean;
  external_urls: ExternalUrlObject;
  href: string;
  id: string;
  images: ImageObject[];
  languages: string[];
  media_type: string;
  name: string;
  narrators: NarratorObject[];
  publisher: string;
  type: "audiobook";
  uri: string;
  total_chapters: number;
};
export type ChapterRestrictionObject = {
  reason?: string;
};
export type ChapterBase = {
  audio_preview_url: string;
  available_markets?: string[];
  chapter_number: number;
  description: string;
  html_description: string;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrlObject;
  href: string;
  id: string;
  images: ImageObject[];
  is_playable: boolean;
  languages: string[];
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  resume_point: ResumePointObject;
  type: "episode";
  uri: string;
  restrictions?: ChapterRestrictionObject;
};
export type SimplifiedChapterObject = ChapterBase;
export type PagingSimplifiedChapterObject = PagingObject & {
  items?: SimplifiedChapterObject[];
};
export type AudiobookObject = AudiobookBase & {
  chapters: PagingSimplifiedChapterObject;
};
export type SavedAudiobookObject = {
  added_at?: string;
  audiobook?: AudiobookObject;
};
export type PagingSavedAudiobookObject = PagingObject & {
  items?: SavedAudiobookObject[];
};
export type SimplifiedAudiobookObject = AudiobookBase;
export type ChapterObject = ChapterBase & {
  audiobook: SimplifiedAudiobookObject;
};
export type PagingTrackObject = PagingObject & {
  items?: TrackObject[];
};
export type PagingArtistObject = PagingObject & {
  items?: ArtistObject[];
};
export type PlaylistUserObject = {
  external_urls?: ExternalUrlObject;
  followers?: FollowersObject;
  href?: string;
  id?: string;
  type?: "user";
  uri?: string;
};
export type PlaylistOwnerObject = PlaylistUserObject & {
  display_name?: string | null;
};
export type PlaylistTracksRefObject = {
  href?: string;
  total?: number;
};
export type SimplifiedPlaylistObject = {
  collaborative?: boolean;
  description?: string;
  external_urls?: ExternalUrlObject;
  href?: string;
  id?: string;
  images?: ImageObject[];
  name?: string;
  owner?: PlaylistOwnerObject;
  public?: boolean;
  snapshot_id?: string;
  tracks?: PlaylistTracksRefObject;
  type?: string;
  uri?: string;
};
export type PagingPlaylistObject = PagingObject & {
  items?: SimplifiedPlaylistObject[];
};
export type PagingSimplifiedShowObject = PagingObject & {
  items?: SimplifiedShowObject[];
};
export type PagingSimplifiedAudiobookObject = PagingObject & {
  items?: SimplifiedAudiobookObject[];
};
export type ExplicitContentSettingsObject = {
  filter_enabled?: boolean;
  filter_locked?: boolean;
};
export type PrivateUserObject = {
  country?: string;
  display_name?: string;
  email?: string;
  explicit_content?: ExplicitContentSettingsObject;
  external_urls?: ExternalUrlObject;
  followers?: FollowersObject;
  href?: string;
  id?: string;
  images?: ImageObject[];
  product?: string;
  type?: string;
  uri?: string;
};
export type PlaylistTrackObject = {
  added_at?: string;
  added_by?: PlaylistUserObject;
  is_local?: boolean;
  track?:
    | ({
        type: "TrackObject";
      } & TrackObject)
    | ({
        type: "EpisodeObject";
      } & EpisodeObject);
};
export type PagingPlaylistTrackObject = PagingObject & {
  items?: PlaylistTrackObject[];
};
export type PlaylistObject = {
  collaborative?: boolean;
  description?: string | null;
  external_urls?: ExternalUrlObject;
  followers?: FollowersObject;
  href?: string;
  id?: string;
  images?: ImageObject[];
  name?: string;
  owner?: PlaylistOwnerObject;
  public?: boolean;
  snapshot_id?: string;
  tracks?: PagingPlaylistTrackObject;
  type?: string;
  uri?: string;
};
export type SavedAlbumObject = {
  added_at?: string;
  album?: AlbumObject;
};
export type PagingSavedAlbumObject = PagingObject & {
  items?: SavedAlbumObject[];
};
export type SavedTrackObject = {
  added_at?: string;
  track?: TrackObject;
};
export type PagingSavedTrackObject = PagingObject & {
  items?: SavedTrackObject[];
};
export type SavedEpisodeObject = {
  added_at?: string;
  episode?: EpisodeObject;
};
export type PagingSavedEpisodeObject = PagingObject & {
  items?: SavedEpisodeObject[];
};
export type SavedShowObject = {
  added_at?: string;
  show?: SimplifiedShowObject;
};
export type PagingSavedShowObject = PagingObject & {
  items?: SavedShowObject[];
};
export type PublicUserObject = {
  display_name?: string | null;
  external_urls?: ExternalUrlObject;
  followers?: FollowersObject;
  href?: string;
  id?: string;
  images?: ImageObject[];
  type?: "user";
  uri?: string;
};
export type PagingFeaturedPlaylistObject = {
  message?: string;
  playlists?: PagingPlaylistObject;
};
export type CategoryObject = {
  href: string;
  icons: ImageObject[];
  id: string;
  name: string;
};
export type CursorObject = {
  after?: string;
  before?: string;
};
export type CursorPagingObject = {
  href?: string;
  limit?: number;
  next?: string;
  cursors?: CursorObject;
  total?: number;
};
export type CursorPagingSimplifiedArtistObject = CursorPagingObject & {
  items?: ArtistObject[];
};
export type Key = number;
export type Loudness = number;
export type Mode = number;
export type Tempo = number;
export type TimeSignature = number;
export type AudioFeaturesObject = {
  acousticness?: number;
  analysis_url?: string;
  danceability?: number;
  duration_ms?: number;
  energy?: number;
  id?: string;
  instrumentalness?: number;
  key?: Key;
  liveness?: number;
  loudness?: Loudness;
  mode?: Mode;
  speechiness?: number;
  tempo?: Tempo;
  time_signature?: TimeSignature;
  track_href?: string;
  type?: "audio_features";
  uri?: string;
  valence?: number;
};
export type TimeIntervalObject = {
  start?: number;
  duration?: number;
  confidence?: number;
};
export type SectionObject = {
  start?: number;
  duration?: number;
  confidence?: number;
  loudness?: number;
  tempo?: number;
  tempo_confidence?: number;
  key?: number;
  key_confidence?: number;
  mode?: -1 | 0 | 1;
  mode_confidence?: number;
  time_signature?: TimeSignature;
  time_signature_confidence?: number;
};
export type SegmentObject = {
  start?: number;
  duration?: number;
  confidence?: number;
  loudness_start?: number;
  loudness_max?: number;
  loudness_max_time?: number;
  loudness_end?: number;
  pitches?: number[];
  timbre?: number[];
};
export type AudioAnalysisObject = {
  meta?: {
    analyzer_version?: string;
    platform?: string;
    detailed_status?: string;
    status_code?: number;
    timestamp?: number;
    analysis_time?: number;
    input_process?: string;
  };
  track?: {
    num_samples?: number;
    duration?: number;
    sample_md5?: string;
    offset_seconds?: number;
    window_seconds?: number;
    analysis_sample_rate?: number;
    analysis_channels?: number;
    end_of_fade_in?: number;
    start_of_fade_out?: number;
    loudness?: Loudness;
    tempo?: Tempo;
    tempo_confidence?: number;
    time_signature?: TimeSignature;
    time_signature_confidence?: number;
    key?: Key;
    key_confidence?: number;
    mode?: Mode;
    mode_confidence?: number;
    codestring?: string;
    code_version?: number;
    echoprintstring?: string;
    echoprint_version?: number;
    synchstring?: string;
    synch_version?: number;
    rhythmstring?: string;
    rhythm_version?: number;
  };
  bars?: TimeIntervalObject[];
  beats?: TimeIntervalObject[];
  sections?: SectionObject[];
  segments?: SegmentObject[];
  tatums?: TimeIntervalObject[];
};
export type RecommendationSeedObject = {
  afterFilteringSize?: number;
  afterRelinkingSize?: number;
  href?: string;
  id?: string;
  initialPoolSize?: number;
  type?: string;
};
export type RecommendationsObject = {
  seeds: RecommendationSeedObject[];
  tracks: TrackObject[];
};
export type DeviceObject = {
  id?: string | null;
  is_active?: boolean;
  is_private_session?: boolean;
  is_restricted?: boolean;
  name?: string;
  type?: string;
  volume_percent?: number | null;
};
export type ContextObject = {
  type?: string;
  href?: string;
  external_urls?: ExternalUrlObject;
  uri?: string;
};
export type DisallowsObject = {
  interrupting_playback?: boolean;
  pausing?: boolean;
  resuming?: boolean;
  seeking?: boolean;
  skipping_next?: boolean;
  skipping_prev?: boolean;
  toggling_repeat_context?: boolean;
  toggling_shuffle?: boolean;
  toggling_repeat_track?: boolean;
  transferring_playback?: boolean;
};
export type CurrentlyPlayingContextObject = {
  device?: DeviceObject;
  repeat_state?: string;
  shuffle_state?: boolean;
  context?: ContextObject;
  timestamp?: number;
  progress_ms?: number;
  is_playing?: boolean;
  item?:
    | ({
        type: "TrackObject";
      } & TrackObject)
    | ({
        type: "EpisodeObject";
      } & EpisodeObject);
  currently_playing_type?: string;
  actions?: DisallowsObject;
};
export type DevicesObject = {
  devices?: DeviceObject[];
};
export type CurrentlyPlayingObject = {
  context?: ContextObject;
  timestamp?: number;
  progress_ms?: number;
  is_playing?: boolean;
  item?:
    | ({
        type: "TrackObject";
      } & TrackObject)
    | ({
        type: "EpisodeObject";
      } & EpisodeObject);
  currently_playing_type?: string;
};
export type PlayHistoryObject = {
  track?: TrackObject;
  played_at?: string;
  context?: ContextObject;
};
export type CursorPagingPlayHistoryObject = CursorPagingObject & {
  items?: PlayHistoryObject[];
};
export type QueueObject = {
  currently_playing?:
    | ({
        type: "TrackObject";
      } & TrackObject)
    | ({
        type: "EpisodeObject";
      } & EpisodeObject);
  queue?: (
    | ({
        type: "TrackObject";
      } & TrackObject)
    | ({
        type: "EpisodeObject";
      } & EpisodeObject)
  )[];
};
/**
 * Get Album
 *
 */
export function getAlbumsById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: AlbumObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/albums/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Albums
 *
 */
export function getAlbums(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            albums: AlbumObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/albums${QS.query(
        QS.explode({
          ids,
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Album Tracks
 *
 */
export function getAlbumsByIdTracks(
  id: string,
  {
    market,
    limit,
    offset,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSimplifiedTrackObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/albums/${encodeURIComponent(id)}/tracks${QS.query(
        QS.explode({
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Artist
 *
 */
export function getArtistsById(id: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: ArtistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/artists/${encodeURIComponent(id)}`, {
      ...opts,
    }),
  );
}
/**
 * Get Several Artists
 *
 */
export function getArtists(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            artists: ArtistObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/artists${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Artist's Albums
 *
 */
export function getArtistsByIdAlbums(
  id: string,
  {
    includeGroups,
    market,
    limit,
    offset,
  }: {
    includeGroups?: string;
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSimplifiedAlbumObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/artists/${encodeURIComponent(id)}/albums${QS.query(
        QS.explode({
          include_groups: includeGroups,
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Artist's Top Tracks
 *
 */
export function getArtistsByIdTopTracks(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            tracks: TrackObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/artists/${encodeURIComponent(id)}/top-tracks${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Artist's Related Artists
 *
 */
export function getArtistsByIdRelatedArtists(id: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            artists: ArtistObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/artists/${encodeURIComponent(id)}/related-artists`, {
      ...opts,
    }),
  );
}
/**
 * Get Show
 *
 */
export function getShowsById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: ShowObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/shows/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Shows
 *
 */
export function getShows(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            shows: SimplifiedShowObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/shows${QS.query(
        QS.explode({
          market,
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Show Episodes
 *
 */
export function getShowsByIdEpisodes(
  id: string,
  {
    market,
    limit,
    offset,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSimplifiedEpisodeObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/shows/${encodeURIComponent(id)}/episodes${QS.query(
        QS.explode({
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Episode
 *
 */
export function getEpisodesById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: EpisodeObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/episodes/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Episodes
 *
 */
export function getEpisodes(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            episodes: EpisodeObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/episodes${QS.query(
        QS.explode({
          ids,
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get an Audiobook
 *
 */
export function getAudiobooksById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: AudiobookObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/audiobooks/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Audiobooks
 *
 */
export function getAudiobooks(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            audiobooks: AudiobookObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/audiobooks${QS.query(
        QS.explode({
          ids,
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Audiobook Chapters
 *
 */
export function getAudiobooksByIdChapters(
  id: string,
  {
    market,
    limit,
    offset,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSimplifiedChapterObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/audiobooks/${encodeURIComponent(id)}/chapters${QS.query(
        QS.explode({
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Saved Audiobooks
 *
 */
export function getMeAudiobooks(
  {
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSavedAudiobookObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/audiobooks${QS.query(
        QS.explode({
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Save Audiobooks for Current User
 *
 */
export function putMeAudiobooks(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/audiobooks${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Remove User's Saved Audiobooks
 *
 */
export function deleteMeAudiobooks(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/audiobooks${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
        method: "DELETE",
      },
    ),
  );
}
/**
 * Check User's Saved Audiobooks
 *
 */
export function getMeAudiobooksContains(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/audiobooks/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get a Chapter
 *
 */
export function getChaptersById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: ChapterObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/chapters/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Chapters
 *
 */
export function getChapters(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            chapters: ChapterObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/chapters${QS.query(
        QS.explode({
          ids,
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Track
 *
 */
export function getTracksById(
  id: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: TrackObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/tracks/${encodeURIComponent(id)}${QS.query(
        QS.explode({
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Tracks
 *
 */
export function getTracks(
  ids: string,
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            tracks: TrackObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/tracks${QS.query(
        QS.explode({
          market,
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Search for Item
 *
 */
export function search(
  q: string,
  $type: ("album" | "artist" | "playlist" | "track" | "show" | "episode" | "audiobook")[],
  {
    market,
    limit,
    offset,
    includeExternal,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
    includeExternal?: "audio";
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            tracks?: PagingTrackObject;
            artists?: PagingArtistObject;
            albums?: PagingSimplifiedAlbumObject;
            playlists?: PagingPlaylistObject;
            shows?: PagingSimplifiedShowObject;
            episodes?: PagingSimplifiedEpisodeObject;
            audiobooks?: PagingSimplifiedAudiobookObject;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/search${QS.query(
        QS.explode({
          q,
          market,
          limit,
          offset,
          include_external: includeExternal,
        }),
        QS.form({
          type: $type,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Current User's Profile
 *
 */
export function getMe(opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PrivateUserObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >("/me", {
      ...opts,
    }),
  );
}
/**
 * Get Playlist
 *
 */
export function getPlaylistsByPlaylistId(
  playlistId: string,
  {
    market,
    fields,
    additionalTypes,
  }: {
    market?: string;
    fields?: string;
    additionalTypes?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}${QS.query(
        QS.explode({
          market,
          fields,
          additional_types: additionalTypes,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Change Playlist Details
 *
 */
export function putPlaylistsByPlaylistId(
  playlistId: string,
  body?: {
    name?: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Get Playlist Items
 *
 */
export function getPlaylistsByPlaylistIdTracks(
  playlistId: string,
  {
    market,
    fields,
    limit,
    offset,
    additionalTypes,
  }: {
    market?: string;
    fields?: string;
    limit?: number;
    offset?: number;
    additionalTypes?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingPlaylistTrackObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/tracks${QS.query(
        QS.explode({
          market,
          fields,
          limit,
          offset,
          additional_types: additionalTypes,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Add Items to Playlist
 *
 */
export function postPlaylistsByPlaylistIdTracks(
  playlistId: string,
  body?: {
    uris?: string[];
    position?: number;
    [key: string]: any;
  },
  {
    position,
    uris,
  }: {
    position?: number;
    uris?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 201;
          data: {
            snapshot_id?: string;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/tracks${QS.query(
        QS.explode({
          position,
          uris,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "POST",
        body,
      }),
    ),
  );
}
/**
 * Update Playlist Items
 *
 */
export function putPlaylistsByPlaylistIdTracks(
  playlistId: string,
  body?: {
    uris?: string[];
    range_start?: number;
    insert_before?: number;
    range_length?: number;
    snapshot_id?: string;
    [key: string]: any;
  },
  {
    uris,
  }: {
    uris?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            snapshot_id?: string;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/tracks${QS.query(
        QS.explode({
          uris,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Remove Playlist Items
 *
 */
export function deletePlaylistsByPlaylistIdTracks(
  playlistId: string,
  body?: {
    tracks: {
      uri?: string;
    }[];
    snapshot_id?: string;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            snapshot_id?: string;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/tracks`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Get Current User's Playlists
 *
 */
export function getMePlaylists(
  {
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingPlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/playlists${QS.query(
        QS.explode({
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Saved Albums
 *
 */
export function getMeAlbums(
  {
    limit,
    offset,
    market,
  }: {
    limit?: number;
    offset?: number;
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSavedAlbumObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/albums${QS.query(
        QS.explode({
          limit,
          offset,
          market,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Save Albums for Current User
 *
 */
export function putMeAlbums(
  ids: string,
  body?: {
    ids?: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/albums${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Remove Users' Saved Albums
 *
 */
export function deleteMeAlbums(
  ids: string,
  body?: {
    ids?: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/albums${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Check User's Saved Albums
 *
 */
export function getMeAlbumsContains(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/albums/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Saved Tracks
 *
 */
export function getMeTracks(
  {
    market,
    limit,
    offset,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSavedTrackObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/tracks${QS.query(
        QS.explode({
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Save Tracks for Current User
 *
 */
export function putMeTracks(
  ids: string,
  body?: {
    ids: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/tracks${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Remove User's Saved Tracks
 *
 */
export function deleteMeTracks(
  ids: string,
  body?: {
    ids?: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/tracks${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Check User's Saved Tracks
 *
 */
export function getMeTracksContains(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/tracks/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Saved Episodes
 *
 */
export function getMeEpisodes(
  {
    market,
    limit,
    offset,
  }: {
    market?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSavedEpisodeObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/episodes${QS.query(
        QS.explode({
          market,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Save Episodes for Current User
 *
 */
export function putMeEpisodes(
  ids: string,
  body?: {
    ids: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/episodes${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Remove User's Saved Episodes
 *
 */
export function deleteMeEpisodes(
  ids: string,
  body?: {
    ids?: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/episodes${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Check User's Saved Episodes
 *
 */
export function getMeEpisodesContains(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/episodes/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Saved Shows
 *
 */
export function getMeShows(
  {
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingSavedShowObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/shows${QS.query(
        QS.explode({
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Save Shows for Current User
 *
 */
export function putMeShows(
  ids: string,
  body?: {
    ids?: string[];
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/shows${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Remove User's Saved Shows
 *
 */
export function deleteMeShows(
  ids: string,
  body?: {
    ids?: string[];
  },
  {
    market,
  }: {
    market?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/shows${QS.query(
        QS.explode({
          ids,
          market,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Check User's Saved Shows
 *
 */
export function getMeShowsContains(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/shows/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Profile
 *
 */
export function getUsersByUserId(userId: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PublicUserObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/users/${encodeURIComponent(userId)}`, {
      ...opts,
    }),
  );
}
/**
 * Get User's Playlists
 *
 */
export function getUsersByUserIdPlaylists(
  userId: string,
  {
    limit,
    offset,
  }: {
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingPlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/users/${encodeURIComponent(userId)}/playlists${QS.query(
        QS.explode({
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Create Playlist
 *
 */
export function postUsersByUserIdPlaylists(
  userId: string,
  body?: {
    name: string;
    public?: boolean;
    collaborative?: boolean;
    description?: string;
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 201;
          data: PlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/users/${encodeURIComponent(userId)}/playlists`,
      oazapfts.json({
        ...opts,
        method: "POST",
        body,
      }),
    ),
  );
}
/**
 * Follow Playlist
 *
 */
export function putPlaylistsByPlaylistIdFollowers(
  playlistId: string,
  body?: {
    public?: boolean;
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/followers`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Unfollow Playlist
 *
 */
export function deletePlaylistsByPlaylistIdFollowers(playlistId: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/playlists/${encodeURIComponent(playlistId)}/followers`, {
      ...opts,
      method: "DELETE",
    }),
  );
}
/**
 * Get Featured Playlists
 *
 */
export function getBrowseFeaturedPlaylists(
  {
    country,
    locale,
    timestamp,
    limit,
    offset,
  }: {
    country?: string;
    locale?: string;
    timestamp?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingFeaturedPlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/browse/featured-playlists${QS.query(
        QS.explode({
          country,
          locale,
          timestamp,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Several Browse Categories
 *
 */
export function getBrowseCategories(
  {
    country,
    locale,
    limit,
    offset,
  }: {
    country?: string;
    locale?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            categories: PagingObject & {
              items?: CategoryObject[];
            };
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/browse/categories${QS.query(
        QS.explode({
          country,
          locale,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Single Browse Category
 *
 */
export function getBrowseCategoriesByCategoryId(
  categoryId: string,
  {
    country,
    locale,
  }: {
    country?: string;
    locale?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: CategoryObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/browse/categories/${encodeURIComponent(categoryId)}${QS.query(
        QS.explode({
          country,
          locale,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Category's Playlists
 *
 */
export function getBrowseCategoriesByCategoryIdPlaylists(
  categoryId: string,
  {
    country,
    limit,
    offset,
  }: {
    country?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingFeaturedPlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/browse/categories/${encodeURIComponent(categoryId)}/playlists${QS.query(
        QS.explode({
          country,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Playlist Cover Image
 *
 */
export function getPlaylistsByPlaylistIdImages(playlistId: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: ImageObject[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/playlists/${encodeURIComponent(playlistId)}/images`, {
      ...opts,
    }),
  );
}
/**
 * Add Custom Playlist Cover Image
 *
 */
export function putPlaylistsByPlaylistIdImages(playlistId: string, body: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/playlists/${encodeURIComponent(playlistId)}/images`, {
      ...opts,
      method: "PUT",
      body,
    }),
  );
}
/**
 * Get New Releases
 *
 */
export function getBrowseNewReleases(
  {
    country,
    limit,
    offset,
  }: {
    country?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            albums: PagingSimplifiedAlbumObject;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/browse/new-releases${QS.query(
        QS.explode({
          country,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Followed Artists
 *
 */
export function getMeFollowing(
  $type: "artist",
  {
    after,
    limit,
  }: {
    after?: string;
    limit?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            artists: CursorPagingSimplifiedArtistObject;
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/following${QS.query(
        QS.explode({
          type: $type,
          after,
          limit,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Follow Artists or Users
 *
 */
export function putMeFollowing(
  $type: "artist" | "user",
  ids: string,
  body?: {
    ids: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/following${QS.query(
        QS.explode({
          type: $type,
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Unfollow Artists or Users
 *
 */
export function deleteMeFollowing(
  $type: "artist" | "user",
  ids: string,
  body?: {
    ids?: string[];
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/following${QS.query(
        QS.explode({
          type: $type,
          ids,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "DELETE",
        body,
      }),
    ),
  );
}
/**
 * Check If User Follows Artists or Users
 *
 */
export function getMeFollowingContains($type: "artist" | "user", ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/following/contains${QS.query(
        QS.explode({
          type: $type,
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Check if Users Follow Playlist
 *
 */
export function getPlaylistsByPlaylistIdFollowersContains(
  playlistId: string,
  ids: string,
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: boolean[];
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/playlists/${encodeURIComponent(playlistId)}/followers/contains${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Tracks' Audio Features
 *
 */
export function getAudioFeatures(ids: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            audio_features: AudioFeaturesObject[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/audio-features${QS.query(
        QS.explode({
          ids,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Track's Audio Features
 *
 */
export function getAudioFeaturesById(id: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: AudioFeaturesObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/audio-features/${encodeURIComponent(id)}`, {
      ...opts,
    }),
  );
}
/**
 * Get Track's Audio Analysis
 *
 */
export function getAudioAnalysisById(id: string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: AudioAnalysisObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(`/audio-analysis/${encodeURIComponent(id)}`, {
      ...opts,
    }),
  );
}
/**
 * Get Recommendations
 *
 */
export function getRecommendations(
  {
    limit,
    market,
    seedArtists,
    seedGenres,
    seedTracks,
    minAcousticness,
    maxAcousticness,
    targetAcousticness,
    minDanceability,
    maxDanceability,
    targetDanceability,
    minDurationMs,
    maxDurationMs,
    targetDurationMs,
    minEnergy,
    maxEnergy,
    targetEnergy,
    minInstrumentalness,
    maxInstrumentalness,
    targetInstrumentalness,
    minKey,
    maxKey,
    targetKey,
    minLiveness,
    maxLiveness,
    targetLiveness,
    minLoudness,
    maxLoudness,
    targetLoudness,
    minMode,
    maxMode,
    targetMode,
    minPopularity,
    maxPopularity,
    targetPopularity,
    minSpeechiness,
    maxSpeechiness,
    targetSpeechiness,
    minTempo,
    maxTempo,
    targetTempo,
    minTimeSignature,
    maxTimeSignature,
    targetTimeSignature,
    minValence,
    maxValence,
    targetValence,
  }: {
    limit?: number;
    market?: string;
    seedArtists?: string;
    seedGenres?: string;
    seedTracks?: string;
    minAcousticness?: number;
    maxAcousticness?: number;
    targetAcousticness?: number;
    minDanceability?: number;
    maxDanceability?: number;
    targetDanceability?: number;
    minDurationMs?: number;
    maxDurationMs?: number;
    targetDurationMs?: number;
    minEnergy?: number;
    maxEnergy?: number;
    targetEnergy?: number;
    minInstrumentalness?: number;
    maxInstrumentalness?: number;
    targetInstrumentalness?: number;
    minKey?: number;
    maxKey?: number;
    targetKey?: number;
    minLiveness?: number;
    maxLiveness?: number;
    targetLiveness?: number;
    minLoudness?: number;
    maxLoudness?: number;
    targetLoudness?: number;
    minMode?: number;
    maxMode?: number;
    targetMode?: number;
    minPopularity?: number;
    maxPopularity?: number;
    targetPopularity?: number;
    minSpeechiness?: number;
    maxSpeechiness?: number;
    targetSpeechiness?: number;
    minTempo?: number;
    maxTempo?: number;
    targetTempo?: number;
    minTimeSignature?: number;
    maxTimeSignature?: number;
    targetTimeSignature?: number;
    minValence?: number;
    maxValence?: number;
    targetValence?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: RecommendationsObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/recommendations${QS.query(
        QS.explode({
          limit,
          market,
          seed_artists: seedArtists,
          seed_genres: seedGenres,
          seed_tracks: seedTracks,
          min_acousticness: minAcousticness,
          max_acousticness: maxAcousticness,
          target_acousticness: targetAcousticness,
          min_danceability: minDanceability,
          max_danceability: maxDanceability,
          target_danceability: targetDanceability,
          min_duration_ms: minDurationMs,
          max_duration_ms: maxDurationMs,
          target_duration_ms: targetDurationMs,
          min_energy: minEnergy,
          max_energy: maxEnergy,
          target_energy: targetEnergy,
          min_instrumentalness: minInstrumentalness,
          max_instrumentalness: maxInstrumentalness,
          target_instrumentalness: targetInstrumentalness,
          min_key: minKey,
          max_key: maxKey,
          target_key: targetKey,
          min_liveness: minLiveness,
          max_liveness: maxLiveness,
          target_liveness: targetLiveness,
          min_loudness: minLoudness,
          max_loudness: maxLoudness,
          target_loudness: targetLoudness,
          min_mode: minMode,
          max_mode: maxMode,
          target_mode: targetMode,
          min_popularity: minPopularity,
          max_popularity: maxPopularity,
          target_popularity: targetPopularity,
          min_speechiness: minSpeechiness,
          max_speechiness: maxSpeechiness,
          target_speechiness: targetSpeechiness,
          min_tempo: minTempo,
          max_tempo: maxTempo,
          target_tempo: targetTempo,
          min_time_signature: minTimeSignature,
          max_time_signature: maxTimeSignature,
          target_time_signature: targetTimeSignature,
          min_valence: minValence,
          max_valence: maxValence,
          target_valence: targetValence,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get Available Genre Seeds
 *
 */
export function getRecommendationsAvailableGenreSeeds(opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            genres: string[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >("/recommendations/available-genre-seeds", {
      ...opts,
    }),
  );
}
/**
 * Get Playback State
 *
 */
export function getMePlayer(
  {
    market,
    additionalTypes,
  }: {
    market?: string;
    additionalTypes?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: CurrentlyPlayingContextObject;
        }
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player${QS.query(
        QS.explode({
          market,
          additional_types: additionalTypes,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Transfer Playback
 *
 */
export function putMePlayer(
  body?: {
    device_ids: string[];
    play?: boolean;
    [key: string]: any;
  },
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      "/me/player",
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Get Available Devices
 *
 */
export function getMePlayerDevices(opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: DevicesObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >("/me/player/devices", {
      ...opts,
    }),
  );
}
/**
 * Get Currently Playing Track
 *
 */
export function getMePlayerCurrentlyPlaying(
  {
    market,
    additionalTypes,
  }: {
    market?: string;
    additionalTypes?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: CurrentlyPlayingObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/currently-playing${QS.query(
        QS.explode({
          market,
          additional_types: additionalTypes,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Start/Resume Playback
 *
 */
export function putMePlayerPlay(
  body?: {
    context_uri?: string;
    uris?: string[];
    offset?: {
      [key: string]: any;
    };
    position_ms?: number;
    [key: string]: any;
  },
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/play${QS.query(
        QS.explode({
          device_id: deviceId,
        }),
      )}`,
      oazapfts.json({
        ...opts,
        method: "PUT",
        body,
      }),
    ),
  );
}
/**
 * Pause Playback
 *
 */
export function putMePlayerPause(
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/pause${QS.query(
        QS.explode({
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Skip To Next
 *
 */
export function postMePlayerNext(
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/next${QS.query(
        QS.explode({
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "POST",
      },
    ),
  );
}
/**
 * Skip To Previous
 *
 */
export function postMePlayerPrevious(
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/previous${QS.query(
        QS.explode({
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "POST",
      },
    ),
  );
}
/**
 * Seek To Position
 *
 */
export function putMePlayerSeek(
  positionMs: number,
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/seek${QS.query(
        QS.explode({
          position_ms: positionMs,
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Set Repeat Mode
 *
 */
export function putMePlayerRepeat(
  state: string,
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/repeat${QS.query(
        QS.explode({
          state,
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Set Playback Volume
 *
 */
export function putMePlayerVolume(
  volumePercent: number,
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/volume${QS.query(
        QS.explode({
          volume_percent: volumePercent,
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Toggle Playback Shuffle
 *
 */
export function putMePlayerShuffle(
  state: boolean,
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/shuffle${QS.query(
        QS.explode({
          state,
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "PUT",
      },
    ),
  );
}
/**
 * Get Recently Played Tracks
 *
 */
export function getMePlayerRecentlyPlayed(
  {
    limit,
    after,
    before,
  }: {
    limit?: number;
    after?: number;
    before?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: CursorPagingPlayHistoryObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/recently-played${QS.query(
        QS.explode({
          limit,
          after,
          before,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get the User's Queue
 *
 */
export function getMePlayerQueue(opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: QueueObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >("/me/player/queue", {
      ...opts,
    }),
  );
}
/**
 * Add Item to Playback Queue
 *
 */
export function postMePlayerQueue(
  uri: string,
  {
    deviceId,
  }: {
    deviceId?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 204;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/player/queue${QS.query(
        QS.explode({
          uri,
          device_id: deviceId,
        }),
      )}`,
      {
        ...opts,
        method: "POST",
      },
    ),
  );
}
/**
 * Get Available Markets
 *
 */
export function getMarkets(opts?: Oazapfts.RequestOpts) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: {
            markets?: string[];
          };
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >("/markets", {
      ...opts,
    }),
  );
}
/**
 * Get User's Top Artists
 *
 */
export function getMeTopArtists(
  {
    timeRange,
    limit,
    offset,
  }: {
    timeRange?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingArtistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/top/artists${QS.query(
        QS.explode({
          time_range: timeRange,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get User's Top Tracks
 *
 */
export function getMeTopTracks(
  {
    timeRange,
    limit,
    offset,
  }: {
    timeRange?: string;
    limit?: number;
    offset?: number;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingTrackObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(
      `/me/top/tracks${QS.query(
        QS.explode({
          time_range: timeRange,
          limit,
          offset,
        }),
      )}`,
      {
        ...opts,
      },
    ),
  );
}
/**
 * Get next page
 *
 */
export function getNext(
  nextUrl: string,
  opts?: Oazapfts.RequestOpts,
) {
  const url = nextUrl.replace(servers.server1, "");
  return oazapfts.ok(
    oazapfts.fetchJson<
      | {
          status: 200;
          data: PagingPlaylistObject;
        }
      | {
          status: 401;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 403;
          data: {
            error: ErrorObject;
          };
        }
      | {
          status: 429;
          data: {
            error: ErrorObject;
          };
        }
    >(url, {
      ...opts,
    }),
  );
}
