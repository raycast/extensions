import { Album, Artist, Playlist, PlayerQueue, QueueItem, Track } from "../music-assistant/external-code/interfaces";

export type LibraryTab = "search" | "browse" | "recent" | "queue";
export type BrowseView = "artists" | "albums" | "playlists" | "artist-detail" | "album-detail" | "playlist-detail";

export type BrowseResult =
  | { type: "artists"; items: Artist[] }
  | { type: "albums"; items: Album[] }
  | { type: "playlists"; items: Playlist[] }
  | { type: "tracks"; items: Track[] };

export interface BreadcrumbState {
  view: BrowseView;
  artist?: Artist;
  album?: Album;
  playlist?: Playlist;
}

export interface QueueManagerData {
  queue: PlayerQueue;
  items: QueueItem[];
}
