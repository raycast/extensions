import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { join } from "path";
import {
  SimplifiedPlaylistObject,
  SimplifiedAlbumObject,
  ArtistObject,
  SimplifiedTrackObject,
  SimplifiedShowObject,
  SimplifiedEpisodeObject,
} from "./spotify.api";
import { executeSQL, executeTransaction, executeWrite, initializeDatabase } from "./sql-utils";
import { getUserPlaylists } from "../api/getUserPlaylists";
import { getMySavedAlbums } from "../api/getMySavedAlbums";
import { getFollowedArtists } from "../api/getFollowedArtists";
import { getMySavedTracks } from "../api/getMySavedTracks";
import { getMySavedShows } from "../api/getMySavedShows";
import { getMySavedEpisodes } from "../api/getMySavedEpisodes";
import { addToMySavedTracks } from "../api/addToMySavedTracks";
import { removeFromMySavedTracks } from "../api/removeFromMySavedTracks";
import { addToMySavedAlbums } from "../api/addToMySavedAlbums";
import { removeFromMySavedAlbums } from "../api/removeFromMySavedAlbums";
import { createPlaylist as createPlaylistApi } from "../api/createPlaylist";

const PAGE_SIZE = 50;

// Executor type compatible with usePromise pagination
export type PaginatedSearchExecutor<T> = (options: { page: number }) => Promise<{ data: T[]; hasMore: boolean }>;

export class YourLibrary {
  private static instance: YourLibrary | null = null;
  private cacheInitialized = false;
  private initializing = false;

  private constructor() {}

  /**
   * Get the singleton instance of YourLibrary
   */
  public static getInstance(): YourLibrary {
    if (!YourLibrary.instance) {
      YourLibrary.instance = new YourLibrary();
    }
    return YourLibrary.instance;
  }

  /**
   * Ensure cache is initialized (check if refresh needed, refresh if so)
   */
  public async ensureCacheInitialized(): Promise<void> {
    if (this.cacheInitialized || this.initializing) {
      return;
    }

    this.initializing = true;

    try {
      const preferences = getPreferenceValues<{ cacheRefreshInterval?: string }>();
      const refreshIntervalHours = parseInt(preferences.cacheRefreshInterval || "72", 10);

      const needsRefresh = await this.shouldRefreshCache(refreshIntervalHours);
      if (needsRefresh) {
        await this.refreshCacheFromAPI();
      }

      this.cacheInitialized = true;
    } catch (err) {
      console.error("[ensureCacheInitialized] Error:", err);
      throw err;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Refresh cache from API
   */
  public async refresh(): Promise<void> {
    await this.refreshCacheFromAPI();
    this.cacheInitialized = true;
  }

  /**
   * Get total counts for all library entity types
   */
  public async counts(): Promise<{
    playlists: number;
    albums: number;
    artists: number;
    tracks: number;
    shows: number;
    episodes: number;
  }> {
    await this.ensureCacheInitialized();
    const dbPath = this.getDatabasePath();

    const [playlistsCount, albumsCount, artistsCount, tracksCount, showsCount, episodesCount] = await Promise.all([
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM albums", []),
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM playlists", []),
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM artists", []),
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM tracks", []),
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM shows", []),
      executeSQL<{ count: number }>(dbPath, "SELECT COUNT(*) as count FROM episodes", []),
    ]);

    return {
      playlists: playlistsCount[0]?.count || 0,
      albums: albumsCount[0]?.count || 0,
      artists: artistsCount[0]?.count || 0,
      tracks: tracksCount[0]?.count || 0,
      shows: showsCount[0]?.count || 0,
      episodes: episodesCount[0]?.count || 0,
    };
  }

  /**
   * Get all playlists at once (no pagination)
   */
  public async getAllPlaylists(): Promise<SimplifiedPlaylistObject[]> {
    await this.ensureCacheInitialized();
    const dbPath = this.getDatabasePath();
    const results = await executeSQL<{ data: string }>(dbPath, "SELECT data FROM playlists ORDER BY name ASC", []);
    return results.map((row) => JSON.parse(row.data) as SimplifiedPlaylistObject);
  }

  /**
   * Check if track IDs exist in the cached saved tracks
   */
  public async containsSavedTrack(trackId?: string): Promise<boolean> {
    if (!trackId) return false;

    const dbPath = this.getDatabasePath();
    const result = await executeSQL<{ id: string }>(dbPath, `SELECT id FROM tracks WHERE id = ?`, [trackId]);
    return result.length > 0;
  }

  /**
   * Check if album IDs exist in the cached saved albums
   */
  public async containsSavedAlbum(albumId: string): Promise<boolean> {
    if (!albumId) return false;

    const dbPath = this.getDatabasePath();
    const result = await executeSQL<{ id: string }>(dbPath, `SELECT id FROM albums WHERE id = ?`, [albumId]);

    return result.length > 0;
  }

  /**
   * Add a track to saved tracks (likes it)
   * Calls the API and updates the local database on success
   */
  public async addSavedTrack(track: SimplifiedTrackObject): Promise<void> {
    if (!track.id) return;

    await addToMySavedTracks({ trackIds: [track.id] });

    const dbPath = this.getDatabasePath();
    const now = Date.now();
    const trackWithAddedAt = { ...track, added_at: new Date().toISOString() };

    await executeTransaction(dbPath, [
      {
        query: `INSERT OR REPLACE INTO tracks (id, name, artist, data, cached_at, added_at) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          track.id,
          track.name || "",
          track.artists?.[0]?.name || "",
          JSON.stringify(trackWithAddedAt),
          now,
          now,
        ],
      },
    ]);
  }

  /**
   * Remove a track from saved tracks (unlikes it)
   * Calls the API and updates the local database on success
   */
  public async removeSavedTrack(trackId: string): Promise<void> {
    if (!trackId) return;

    await removeFromMySavedTracks({ trackIds: [trackId] });

    const dbPath = this.getDatabasePath();
    await executeWrite(dbPath, `DELETE FROM tracks WHERE id = ?`, [trackId]);
  }

  /**
   * Add an album to saved albums
   * Calls the API and updates the local database on success
   */
  public async addSavedAlbum(album: SimplifiedAlbumObject): Promise<void> {
    if (!album.id) return;

    // Call the API first
    await addToMySavedAlbums({ albumIds: [album.id] });

    // On success, add to local database
    const dbPath = this.getDatabasePath();
    const now = Date.now();
    const albumWithAddedAt = { ...album, added_at: new Date().toISOString() };

    await executeTransaction(dbPath, [
      {
        query: `INSERT OR REPLACE INTO albums (id, name, artist, data, cached_at, added_at) VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          album.id,
          album.name || "",
          album.artists?.[0]?.name || "",
          JSON.stringify(albumWithAddedAt),
          now,
          now,
        ],
      },
    ]);
  }

  /**
   * Remove an album from saved albums
   * Calls the API and updates the local database on success
   */
  public async removeSavedAlbum(albumId: string): Promise<void> {
    if (!albumId) return;

    // Call the API first
    await removeFromMySavedAlbums({ albumIds: [albumId] });

    // On success, remove from local database
    const dbPath = this.getDatabasePath();
    await executeWrite(dbPath, `DELETE FROM albums WHERE id = ?`, [albumId]);
  }

  /**
   * Create a new playlist
   * Calls the API and adds the playlist to the local database on success
   */
  public async createPlaylist(name: string, description: string): Promise<SimplifiedPlaylistObject | undefined> {
    // Call the API first
    const playlist = await createPlaylistApi({ name, description });

    if (!playlist || !playlist.id) {
      return undefined;
    }

    // On success, add to local database
    const dbPath = this.getDatabasePath();
    const now = Date.now();

    await executeTransaction(dbPath, [
      {
        query: `INSERT OR REPLACE INTO playlists (id, name, data, cached_at) VALUES (?, ?, ?, ?)`,
        params: [playlist.id, playlist.name || "", JSON.stringify(playlist), now],
      },
    ]);

    return playlist as SimplifiedPlaylistObject;
  }

  /**
   * Search playlists - returns a paginated executor function
   */
  public searchPlaylists(searchText: string): PaginatedSearchExecutor<SimplifiedPlaylistObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM playlists WHERE LOWER(name) LIKE LOWER(?) ORDER BY name ASC LIMIT ? OFFSET ?",
        [searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as SimplifiedPlaylistObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  /**
   * Search albums - returns a paginated executor function
   */
  public searchAlbums(searchText: string): PaginatedSearchExecutor<SimplifiedAlbumObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM albums WHERE LOWER(name) LIKE LOWER(?) OR LOWER(artist) LIKE LOWER(?) ORDER BY added_at DESC LIMIT ? OFFSET ?",
        [searchPattern, searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as SimplifiedAlbumObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  /**
   * Search artists - returns a paginated executor function
   */
  public searchArtists(searchText: string): PaginatedSearchExecutor<ArtistObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM artists WHERE LOWER(name) LIKE LOWER(?) ORDER BY cached_at DESC LIMIT ? OFFSET ?",
        [searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as ArtistObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  /**
   * Search tracks - returns a paginated executor function
   */
  public searchTracks(searchText: string): PaginatedSearchExecutor<SimplifiedTrackObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM tracks WHERE LOWER(name) LIKE LOWER(?) OR LOWER(artist) LIKE LOWER(?) ORDER BY added_at DESC LIMIT ? OFFSET ?",
        [searchPattern, searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as SimplifiedTrackObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  /**
   * Search shows - returns a paginated executor function
   */
  public searchShows(searchText: string): PaginatedSearchExecutor<SimplifiedShowObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM shows WHERE LOWER(name) LIKE LOWER(?) ORDER BY added_at DESC LIMIT ? OFFSET ?",
        [searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as SimplifiedShowObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  /**
   * Search episodes - returns a paginated executor function
   */
  public searchEpisodes(searchText: string): PaginatedSearchExecutor<SimplifiedEpisodeObject> {
    return async ({ page }) => {
      await this.ensureCacheInitialized();
      const dbPath = this.getDatabasePath();
      const offset = page * PAGE_SIZE;
      const searchPattern = searchText ? `%${searchText}%` : "%";
      const results = await executeSQL<{ data: string }>(
        dbPath,
        "SELECT data FROM episodes WHERE LOWER(name) LIKE LOWER(?) ORDER BY added_at DESC LIMIT ? OFFSET ?",
        [searchPattern, PAGE_SIZE, offset],
      );
      const data = results.map((row) => JSON.parse(row.data) as SimplifiedEpisodeObject);
      return {
        data,
        hasMore: data.length >= PAGE_SIZE,
      };
    };
  }

  private getDatabasePath(): string {
    return join(environment.supportPath, "spotify-library.db");
  }

  private async isDatabaseEmpty(): Promise<boolean> {
    try {
      const dbPath = this.getDatabasePath();
      const result = await executeSQL<{ count: number }>(
        dbPath,
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='metadata'",
      );
      return result.length === 0 || result[0].count === 0;
    } catch {
      // If database doesn't exist or has errors, consider it empty
      return true;
    }
  }

  private async createSchema(): Promise<void> {
    const dbPath = this.getDatabasePath();
    const schema = `
      -- Metadata table
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      -- Playlists table
      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name);

      -- Albums table
      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        artist TEXT,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL,
        added_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);
      CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist);
      CREATE INDEX IF NOT EXISTS idx_albums_added_at ON albums(added_at);

      -- Artists table
      CREATE TABLE IF NOT EXISTS artists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);

      -- Tracks table
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        artist TEXT,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL,
        added_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(name);
      CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
      CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at);

      -- Shows table
      CREATE TABLE IF NOT EXISTS shows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL,
        added_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_shows_name ON shows(name);
      CREATE INDEX IF NOT EXISTS idx_shows_added_at ON shows(added_at);

      -- Episodes table
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSON NOT NULL,
        cached_at INTEGER NOT NULL,
        added_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_episodes_name ON episodes(name);
      CREATE INDEX IF NOT EXISTS idx_episodes_added_at ON episodes(added_at);
    `;

    await initializeDatabase(dbPath, schema);
  }

  private iso8601ToTimestamp(isoString: string | undefined): number | null {
    if (!isoString) return null;
    try {
      return new Date(isoString).getTime();
    } catch {
      return null;
    }
  }

  private async insertBatch(table: string, columns: string[], rows: (string | number | null)[][]): Promise<void> {
    const dbPath = this.getDatabasePath();
    const placeholders = columns.map(() => "?").join(", ");
    const query = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
    const operations = rows.map((params) => ({ query, params }));
    await executeTransaction(dbPath, operations);
  }

  private async shouldRefreshCache(refreshIntervalHours: number): Promise<boolean> {
    try {
      const dbPath = this.getDatabasePath();
      const isEmpty = await this.isDatabaseEmpty();
      if (isEmpty) {
        return true;
      }

      const result = await executeSQL<{ value: string }>(dbPath, "SELECT value FROM metadata WHERE key = ?", [
        "last_refresh",
      ]);

      if (result.length === 0) {
        return true;
      }

      const lastRefresh = parseInt(result[0].value, 10);
      const hoursSinceRefresh = (Date.now() - lastRefresh) / (1000 * 60 * 60);
      return hoursSinceRefresh >= refreshIntervalHours;
    } catch {
      return true;
    }
  }

  private async refreshCacheFromAPI(): Promise<void> {
    const dbPath = this.getDatabasePath();

    await showToast({
      style: Toast.Style.Animated,
      title: "Importing library data...",
    });

    try {
      await this.createSchema();

      // Playlists
      await executeWrite(dbPath, "DELETE FROM playlists");
      for await (const { playlists, offset, total } of getUserPlaylists({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 1/6: Playlists (${offset + playlists.length} of ${total})`,
        });
        const now = Date.now();
        await this.insertBatch(
          "playlists",
          ["id", "name", "data", "cached_at"],
          playlists.map((p) => [p.id || "", p.name || "", JSON.stringify(p), now]),
        );
      }

      // Albums (has artist + added_at)
      await executeWrite(dbPath, "DELETE FROM albums");
      for await (const { albums, offset, total } of getMySavedAlbums({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 2/6: Albums (${offset + albums.length} of ${total})`,
        });
        const now = Date.now();
        await this.insertBatch(
          "albums",
          ["id", "name", "artist", "data", "cached_at", "added_at"],
          albums.map((a) => [
            a.id || "",
            a.name || "",
            a.artists?.[0]?.name || "",
            JSON.stringify(a),
            now,
            this.iso8601ToTimestamp(a.added_at),
          ]),
        );
      }

      // Artists
      await executeWrite(dbPath, "DELETE FROM artists");
      for await (const { artists, offset } of getFollowedArtists({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 3/6: Artists (${offset + artists.length} imported)`,
        });
        const now = Date.now();
        await this.insertBatch(
          "artists",
          ["id", "name", "data", "cached_at"],
          artists.map((a) => [a.id || "", a.name || "", JSON.stringify(a), now]),
        );
      }

      // Tracks (has artist + added_at)
      await executeWrite(dbPath, "DELETE FROM tracks");
      for await (const { tracks, offset, total } of getMySavedTracks({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 4/6: Tracks (${offset + tracks.length} of ${total})`,
        });
        const now = Date.now();
        await this.insertBatch(
          "tracks",
          ["id", "name", "artist", "data", "cached_at", "added_at"],
          tracks.map((t) => [
            t.id || "",
            t.name || "",
            t.artists?.[0]?.name || "",
            JSON.stringify(t),
            now,
            this.iso8601ToTimestamp(t.added_at),
          ]),
        );
      }

      // Shows (has added_at)
      await executeWrite(dbPath, "DELETE FROM shows");
      for await (const { shows, offset, total } of getMySavedShows({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 5/6: Shows (${offset + shows.length} of ${total})`,
        });
        const now = Date.now();
        await this.insertBatch(
          "shows",
          ["id", "name", "data", "cached_at", "added_at"],
          shows.map((s) => [s.id || "", s.name || "", JSON.stringify(s), now, this.iso8601ToTimestamp(s.added_at)]),
        );
      }

      // Episodes (has added_at)
      await executeWrite(dbPath, "DELETE FROM episodes");
      for await (const { episodes, offset, total } of getMySavedEpisodes({ limit: 10000 })) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Importing library data 6/6: Episodes (${offset} of ${total})`,
        });
        const now = Date.now();
        await this.insertBatch(
          "episodes",
          ["id", "name", "data", "cached_at", "added_at"],
          episodes.map((e) => [e.id || "", e.name || "", JSON.stringify(e), now, this.iso8601ToTimestamp(e.added_at)]),
        );
      }

      // Update last_refresh timestamp
      await executeTransaction(dbPath, [
        {
          query: "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)",
          params: ["last_refresh", Date.now().toString()],
        },
      ]);

      await showToast({
        style: Toast.Style.Success,
        title: "Library data imported successfully",
      });
    } catch (error) {
      console.error("[refreshCacheFromAPI] Error refreshing cache:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to import library data",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
