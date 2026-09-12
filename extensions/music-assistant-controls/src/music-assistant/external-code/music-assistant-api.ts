/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  type Artist,
  type Album,
  type Track,
  type Radio,
  type Playlist,
  type Player,
  type PlayerQueue,
  type MediaItemType,
  MediaType,
  type QueueItem,
  QueueOption,
  type ProviderInstance,
  EventType,
  type ServerInfoMessage,
  type ErrorResultMessage,
  type SyncTask,
  RepeatMode,
  SearchResults,
  ProviderManifest,
  ProviderType,
  ProviderConfig,
  ConfigValueType,
  ConfigEntry,
  PlayerConfig,
  CoreConfig,
  ItemMapping,
  AlbumType,
  DSPConfig,
  Audiobook,
  Podcast,
  PodcastEpisode,
  PlayableMediaItemType,
  MediaItemTypeOrItemMapping,
  BuiltinPlayerState,
  RecommendationFolder,
} from "./interfaces";

export enum ConnectionState {
  DISCONNECTED = 0,
  CONNECTING = 1,
  CONNECTED = 2,
}
/**
 * REST API client for Music Assistant
 * Adapted from https://github.com/music-assistant/frontend/blob/main/src/plugins/api/index.ts
 * Uses HTTP REST API instead of WebSocket for simpler integration with Raycast
 */
export class MusicAssistantApi {
  private authToken?: string;
  public baseUrl?: string;
  public state: ConnectionState = ConnectionState.DISCONNECTED;
  public serverInfo?: ServerInfoMessage;
  public players: { [player_id: string]: Player } = {};
  public queues: { [queue_id: string]: PlayerQueue } = {};
  public providers: { [instance_id: string]: ProviderInstance } = {};
  public providerManifests: { [domain: string]: ProviderManifest } = {};
  public syncTasks: SyncTask[] = [];

  public get hasStreamingProviders() {
    return Object.values(this.providers).some((p) => p.is_streaming_provider);
  }

  constructor(private debug = false) {}

  private log(...args: any[]) {
    if (this.debug) {
      console.log("[MusicAssistantApi]", ...args);
    }
  }

  public close() {
    // No-op for REST API, kept for compatibility
  }

  public initialize(baseUrl: string, authToken: string) {
    if (this.state === ConnectionState.CONNECTED) throw new Error("already initialized");
    if (!authToken) throw new Error("Authentication token is required");
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    this.authToken = authToken;
    this.baseUrl = baseUrl;
    this.state = ConnectionState.CONNECTED;
    this.log(`Connected to Music Assistant API at ${baseUrl}`);
  }

  /**
   * Send a command to the Music Assistant REST API
   * @param command - The command to execute (e.g., "players/all")
   * @param args - Optional arguments for the command
   * @returns Promise with the command result
   */
  public async sendCommand<Result>(command: string, args?: Record<string, any>): Promise<Result> {
    if (!this.baseUrl || !this.authToken) {
      throw new Error("API not initialized");
    }

    const url = `${this.baseUrl}/api`;
    const body = JSON.stringify({ command, args: args || {} });

    this.log("[sendCommand]", { command, args });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data && typeof data === "object" && ("error_code" in data || "error" in data)) {
        const err = (data as ErrorResultMessage).details || (data as ErrorResultMessage).error_code || data.error;
        throw new Error(err || "Unknown API error");
      }

      this.log("[sendCommand] response", data);
      return data?.result || data;
    } catch (error) {
      this.log("[sendCommand] error", error);
      throw error;
    }
  }

  // Legacy methods - no-op for REST API but kept for compatibility
  public subscribe(eventFilter: EventType, callback: CallableFunction, object_id: string = "*") {
    // No-op for REST API (events not supported)
    return () => {}; // Return no-op unsubscribe function
  }

  public subscribe_multi(eventFilters: EventType[], callback: CallableFunction, object_id: string = "*") {
    // No-op for REST API (events not supported)
    return () => {}; // Return no-op unsubscribe function
  }

  // Library functions - now using REST API

  /* PLACEHOLDER_START - WebSocket code removed */
  /* This section previously contained WebSocket connection handling */
  /* Now replaced with simple REST API calls via sendCommand() */
  /* PLACEHOLDER_END */

  public getLibraryTracks(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
  ): Promise<Track[]> {
    return this.sendCommand("music/tracks/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
    });
  }

  public getTrack(item_id: string, provider_instance_id_or_domain: string, album_uri?: string): Promise<Track> {
    return this.sendCommand("music/tracks/get_track", {
      item_id,
      provider_instance_id_or_domain,
      album_uri: album_uri,
    });
  }

  public getTrackVersions(item_id: string, provider_instance_id_or_domain: string): Promise<Track[]> {
    return this.sendCommand("music/tracks/track_versions", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getTrackAlbums(
    item_id: string,
    provider_instance_id_or_domain: string,
    in_library_only = false,
  ): Promise<Album[]> {
    return this.sendCommand("music/tracks/track_albums", {
      item_id,
      provider_instance_id_or_domain,
      in_library_only,
    });
  }

  public getTrackPreviewUrl(provider_instance_id_or_domain: string, item_id: string): string {
    const encItemId = encodeURIComponent(encodeURIComponent(item_id));
    return `${this.baseUrl}/preview?item_id=${encItemId}&provider=${provider_instance_id_or_domain}`;
  }

  public getLibraryArtistsCount(favorite_only: boolean = false, album_artists_only: boolean = false): Promise<number> {
    return this.sendCommand("music/artists/count", {
      favorite_only,
      album_artists_only,
    });
  }
  public getLibraryAlbumsCount(
    favorite_only: boolean = false,
    album_types?: Array<AlbumType | string>,
  ): Promise<number> {
    return this.sendCommand("music/albums/count", {
      favorite_only,
      album_types,
    });
  }
  public getLibraryTracksCount(favorite_only: boolean = false): Promise<number> {
    return this.sendCommand("music/tracks/count", { favorite_only });
  }
  public getLibraryPlaylistsCount(favorite_only: boolean = false): Promise<number> {
    return this.sendCommand("music/playlists/count", { favorite_only });
  }
  public getLibraryRadiosCount(favorite_only: boolean = false): Promise<number> {
    return this.sendCommand("music/radios/count", { favorite_only });
  }

  public getLibraryPodcastsCount(favorite_only: boolean = false): Promise<number> {
    return this.sendCommand("music/podcasts/count", { favorite_only });
  }

  public getLibraryAudiobooksCount(favorite_only: boolean = false): Promise<number> {
    return this.sendCommand("music/audiobooks/count", { favorite_only });
  }

  public getLibraryArtists(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
    album_artists_only?: boolean,
  ): Promise<Artist[]> {
    return this.sendCommand("music/artists/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
      album_artists_only,
    });
  }

  public getArtist(item_id: string, provider_instance_id_or_domain: string): Promise<Artist> {
    return this.sendCommand("music/artists/get_artist", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getArtistTracks(
    item_id: string,
    provider_instance_id_or_domain: string,
    in_library_only = false,
  ): Promise<Track[]> {
    return this.sendCommand("music/artists/artist_tracks", {
      item_id,
      provider_instance_id_or_domain,
      in_library_only,
    });
  }

  public getArtistAlbums(
    item_id: string,
    provider_instance_id_or_domain: string,
    in_library_only = false,
  ): Promise<Album[]> {
    return this.sendCommand("music/artists/artist_albums", {
      item_id,
      provider_instance_id_or_domain,
      in_library_only,
    });
  }

  public getLibraryAlbums(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
    album_types?: Array<AlbumType | string>,
  ): Promise<Album[]> {
    return this.sendCommand("music/albums/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
      album_types,
    });
  }

  public getAlbum(item_id: string, provider_instance_id_or_domain: string): Promise<Album> {
    return this.sendCommand("music/albums/get_album", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getAlbumTracks(
    item_id: string,
    provider_instance_id_or_domain: string,
    in_library_only = false,
  ): Promise<Track[]> {
    return this.sendCommand("music/albums/album_tracks", {
      item_id,
      provider_instance_id_or_domain,
      in_library_only,
    });
  }

  public getAlbumVersions(item_id: string, provider_instance_id_or_domain: string): Promise<Album[]> {
    return this.sendCommand("music/albums/album_versions", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getLibraryPlaylists(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
  ): Promise<Playlist[]> {
    return this.sendCommand("music/playlists/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
    });
  }

  public getPlaylist(item_id: string, provider_instance_id_or_domain: string): Promise<Playlist> {
    return this.sendCommand("music/playlists/get_playlist", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getPlaylistTracks(
    item_id: string,
    provider_instance_id_or_domain: string,
    force_refresh?: boolean,
  ): Promise<Track[]> {
    return this.sendCommand("music/playlists/playlist_tracks", {
      item_id,
      provider_instance_id_or_domain,
      force_refresh,
    });
  }

  public addPlaylistTracks(db_playlist_id: string | number, uris: string[]): Promise<void> {
    return this.sendCommand("music/playlists/add_playlist_tracks", {
      db_playlist_id,
      uris,
    });
  }

  public removePlaylistTracks(db_playlist_id: string | number, positions_to_remove: number[]): Promise<void> {
    return this.sendCommand("music/playlists/remove_playlist_tracks", {
      db_playlist_id,
      positions_to_remove,
    });
  }

  public createPlaylist(name: string, provider_instance_or_domain?: string): Promise<Playlist> {
    return this.sendCommand("music/playlists/create_playlist", {
      name,
      provider_instance_or_domain,
    });
  }

  public getLibraryRadios(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
  ): Promise<Radio[]> {
    return this.sendCommand("music/radios/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
    });
  }

  public getRadio(item_id: string, provider_instance_id_or_domain: string): Promise<Radio> {
    return this.sendCommand("music/radios/get_radio", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getRadioVersions(item_id: string, provider_instance_id_or_domain: string): Promise<Radio[]> {
    return this.sendCommand("music/radios/radio_versions", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  // Audiobook related endpoints
  public getLibraryAudiobooks(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
  ): Promise<Audiobook[]> {
    return this.sendCommand("music/audiobooks/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
    });
  }

  public getAudiobook(item_id: string, provider_instance_id_or_domain: string): Promise<Audiobook> {
    return this.sendCommand("music/audiobooks/get_audiobook", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getAudiobookVersions(item_id: string, provider_instance_id_or_domain: string): Promise<Audiobook[]> {
    return this.sendCommand("music/audiobooks/audiobook_versions", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  // Podcast related endpoints
  public getLibraryPodcasts(
    favorite?: boolean,
    search?: string,
    limit?: number,
    offset?: number,
    order_by?: string,
  ): Promise<Podcast[]> {
    return this.sendCommand("music/podcasts/library_items", {
      favorite,
      search,
      limit,
      offset,
      order_by,
    });
  }

  public getPodcast(item_id: string, provider_instance_id_or_domain: string): Promise<Podcast> {
    return this.sendCommand("music/podcasts/get_podcast", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public gePodcastVersions(item_id: string, provider_instance_id_or_domain: string): Promise<Podcast[]> {
    return this.sendCommand("music/podcasts/podcast_versions", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getPodcastEpisodes(item_id: string, provider_instance_id_or_domain: string): Promise<PodcastEpisode[]> {
    return this.sendCommand("music/podcasts/podcast_episodes", {
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getItemByUri(uri: string): Promise<MediaItemType> {
    // Get single music item providing a mediaitem uri.
    return this.sendCommand("music/item_by_uri", {
      uri,
    });
  }

  public refreshItem(media_item: MediaItemType | ItemMapping): Promise<MediaItemType> {
    // Try to refresh a mediaitem by requesting it's full object or search for substitutes.
    return this.sendCommand("music/refresh_item", {
      media_item,
    });
  }

  public updateMetadata(item: MediaItemType | ItemMapping | string, force_refresh = false): Promise<MediaItemType> {
    // Update an item's (extra) metadata.
    return this.sendCommand("metadata/update_metadata", {
      item,
      force_refresh,
    });
  }

  public getItem(
    media_type: MediaType,
    item_id: string,
    provider_instance_id_or_domain: string,
  ): Promise<MediaItemType> {
    // Get single music item by id and media type.
    return this.sendCommand("music/item", {
      media_type,
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public getLibraryItem(
    media_type: MediaType,
    item_id: string,
    provider_instance_id_or_domain: string,
  ): Promise<MediaItemType | null> {
    // Get single music item by id and media type.
    return this.sendCommand("music/get_library_item", {
      media_type,
      item_id,
      provider_instance_id_or_domain,
    });
  }

  public async addItemToLibrary(item: string | MediaItemType | ItemMapping, overwrite_existing = false): Promise<void> {
    // Add an item (uri or mediaitem) to the library.
    return this.sendCommand("music/library/add_item", {
      item,
      overwrite_existing,
    });
  }

  public async removeItemFromLibrary(media_type: MediaType, library_item_id: string | number): Promise<void> {
    // Remove an item from the library.
    return this.sendCommand("music/library/remove_item", {
      media_type,
      library_item_id,
    });
  }

  public async addItemToFavorites(item: string | MediaItemType | ItemMapping): Promise<void> {
    // optimistically set the value
    if (typeof item !== "string" && "favorite" in item) {
      item.favorite = true;
    }
    // Add an item (uri or mediaitem) to the favorites.
    return this.sendCommand("music/favorites/add_item", {
      item,
    });
  }
  public async removeItemFromFavorites(media_type: MediaType, library_item_id: string | number): Promise<void> {
    // Remove a library item from favorites.
    return this.sendCommand("music/favorites/remove_item", {
      media_type,
      library_item_id,
    });
  }

  public browse(path?: string): Promise<MediaItemType[]> {
    // Browse Music providers.
    return this.sendCommand("music/browse", { path });
  }

  public search(search_query: string, media_types?: MediaType[], limit?: number): Promise<SearchResults> {
    // Perform global search for media items on all providers.
    return this.sendCommand("music/search", {
      search_query,
      media_types,
      limit,
    });
  }

  public async getRecentlyPlayedItems(limit = 10, media_types?: MediaType[]): Promise<ItemMapping[]> {
    return this.sendCommand("music/recently_played_items", {
      limit,
      media_types,
    });
  }

  public async getInProgressItems(limit = 10): Promise<ItemMapping[]> {
    return this.sendCommand("music/in_progress_items", {
      limit,
    });
  }

  public async getRecommendations(): Promise<RecommendationFolder[]> {
    return this.sendCommand("music/recommendations");
  }

  public markItemPlayed(
    media_item: MediaItemTypeOrItemMapping,
    fully_played?: boolean,
    seconds_played?: number,
  ): Promise<void> {
    if ("fully_played" in media_item) media_item.fully_played = fully_played;
    if ("resume_position_ms" in media_item) delete media_item.resume_position_ms;
    // Mark item as played in the playlog
    return this.sendCommand("music/mark_played", {
      media_item,
      fully_played,
      seconds_played,
    });
  }
  public markItemUnPlayed(media_item: MediaItemTypeOrItemMapping): Promise<void> {
    if ("fully_played" in media_item) media_item.fully_played = false;
    if ("resume_position_ms" in media_item) delete media_item.resume_position_ms;
    // Mark item as unplayed in the playlog
    return this.sendCommand("music/mark_unplayed", {
      media_item,
    });
  }

  // PlayerQueue related functions/commands

  public async getPlayerQueues(): Promise<PlayerQueue[]> {
    // Get all registered PlayerQueues
    return this.sendCommand("player_queues/all");
  }

  public async getPlayerQueue(queue_id: string): Promise<PlayerQueue> {
    // get specific queue
    return await this.sendCommand("player_queues/get", {
      queue_id,
    });
  }

  public getPlayerQueueItems(queue_id: string, limit: number, offset: number): Promise<QueueItem[]> {
    // Get all QueueItems for given PlayerQueue
    return this.sendCommand("player_queues/items", {
      queue_id,
      limit,
      offset,
    });
  }
  public queueCommandClear(queueId: string): Promise<void> {
    // Clear all items in the queue.
    return this.playerQueueCommand(queueId, "clear");
  }
  public queueCommandPlayIndex(queueId: string, index: number | string): Promise<void> {
    // Play item at index (or item_id) X in queue.
    return this.playerQueueCommand(queueId, "play_index", { index });
  }
  public queueCommandMoveItem(queueId: string, queue_item_id: string, pos_shift = 1): Promise<void> {
    // Move queue item x up/down the queue.
    // - queue_id: id of the queue to process this request.
    // - queue_item_id: the item_id of the queueitem that needs to be moved.
    // - pos_shift: move item x positions down if positive value
    // - pos_shift: move item x positions up if negative value
    // - pos_shift:  move item to top of queue as next item if 0
    return this.playerQueueCommand(queueId, "move_item", { queue_item_id, pos_shift });
  }
  public queueCommandMoveUp(queueId: string, queue_item_id: string): Promise<void> {
    return this.queueCommandMoveItem(queueId, queue_item_id, -1);
  }
  public queueCommandMoveDown(queueId: string, queue_item_id: string): Promise<void> {
    return this.queueCommandMoveItem(queueId, queue_item_id, 1);
  }
  public queueCommandMoveNext(queueId: string, queue_item_id: string): Promise<void> {
    return this.queueCommandMoveItem(queueId, queue_item_id, 0);
  }
  public queueCommandDelete(queueId: string, item_id_or_index: number | string): Promise<void> {
    // Delete item (by id or index) from the queue.
    return this.playerQueueCommand(queueId, "delete_item", { item_id_or_index });
  }

  public queueCommandSeek(queueId: string, position: number): Promise<void> {
    // Handle SEEK command for given queue.
    // - position: position in seconds to seek to in the current playing item.
    return this.playerQueueCommand(queueId, "seek", { position });
  }
  public queueCommandSkip(queueId: string, seconds: number): Promise<void> {
    // Handle SKIP command for given queue.
    // - seconds: number of seconds to skip in track. Use negative value to skip back.
    return this.playerQueueCommand(queueId, "skip", { seconds });
  }
  public queueCommandSkipAhead(queueId: string): Promise<void> {
    return this.queueCommandSkip(queueId, 10);
  }
  public queueCommandSkipBack(queueId: string): Promise<void> {
    return this.queueCommandSkip(queueId, -10);
  }
  public queueCommandShuffle(queueId: string, shuffle_enabled: boolean): Promise<void> {
    // Configure shuffle setting on the the queue.
    return this.playerQueueCommand(queueId, "shuffle", { shuffle_enabled });
  }
  public queueCommandShuffleToggle(queueId: string, currentShuffleEnabled: boolean): Promise<void> {
    // Toggle shuffle mode for a queue
    return this.queueCommandShuffle(queueId, !currentShuffleEnabled);
  }
  public queueCommandRepeat(queueId: string, repeat_mode: RepeatMode): Promise<void> {
    // Configure repeat setting on the the queue.
    return this.playerQueueCommand(queueId, "repeat", { repeat_mode });
  }
  public queueCommandRepeatToggle(queueId: string, currentRepeatMode: RepeatMode): Promise<void> {
    // Toggle repeat mode of a queue
    if (currentRepeatMode == RepeatMode.OFF) {
      return this.queueCommandRepeat(queueId, RepeatMode.ONE);
    } else if (currentRepeatMode == RepeatMode.ONE) {
      return this.queueCommandRepeat(queueId, RepeatMode.ALL);
    } else {
      return this.queueCommandRepeat(queueId, RepeatMode.OFF);
    }
  }
  public queueCommandDontStopTheMusic(queueId: string, dont_stop_the_music_enabled: boolean): Promise<void> {
    // Configure dont_stop_the_music setting on the the queue.
    return this.playerQueueCommand(queueId, "dont_stop_the_music", {
      dont_stop_the_music_enabled,
    });
  }
  public queueCommandDontStopTheMusicToggle(queueId: string, currentDontStopTheMusic: boolean): Promise<void> {
    // Toggle dont_stop_the_music mode of a queue
    return this.queueCommandDontStopTheMusic(queueId, !currentDontStopTheMusic);
  }
  public playerQueueCommand(queue_id: string, command: string, args?: Record<string, any>): Promise<void> {
    /*
      Handle command to player queue
    */
    return this.sendCommand(`player_queues/${command}`, {
      queue_id,
      ...args,
    });
  }
  public queueCommandTransfer(sourceQueue: string, targetQueue: string, autoPlay?: boolean): Promise<void> {
    // Transfer queue to another queue.
    return this.sendCommand("player_queues/transfer", {
      source_queue_id: sourceQueue,
      target_queue_id: targetQueue,
      auto_play: autoPlay,
    });
  }

  // Player related functions/commands

  public async getPlayers(): Promise<Player[]> {
    // Get all registered players.
    return this.sendCommand("players/all");
  }
  public async getPlayer(player_id: string): Promise<Player> {
    return this.sendCommand("players/get", {
      player_id,
      raise_unavailable: true,
    });
  }

  public playerCommandPlay(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "play");
  }
  public playerCommandPause(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "pause");
  }
  public playerCommandPlayPause(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "play_pause");
  }
  public playerCommandStop(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "stop");
  }
  public playerCommandNext(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "next");
  }
  public playerCommandPrevious(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "previous");
  }
  public playerCommandSeek(playerId: string, position: number) {
    this.playerCommand(playerId, "seek", { position });
  }

  public playerCommandPower(playerId: string, powered: boolean): Promise<void> {
    return this.playerCommand(playerId, "power", { powered });
  }

  public playerCommandPowerToggle(playerId: string): Promise<void> {
    return this.playerCommandPower(playerId, !this.players[playerId].powered);
  }

  public async playerCommandVolumeSet(playerId: string, newVolume: number) {
    newVolume = Math.max(newVolume, 0);
    newVolume = Math.min(newVolume, 100);

    await this.playerCommand(playerId, "volume_set", {
      volume_level: newVolume,
    });
  }
  public playerCommandVolumeUp(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "volume_up");
  }
  public playerCommandVolumeDown(playerId: string): Promise<void> {
    return this.playerCommand(playerId, "volume_down");
  }
  public async playerCommandVolumeMute(playerId: string, muted: boolean): Promise<void> {
    await this.playerCommand(playerId, "volume_mute", {
      muted,
    });
  }

  public playerCommandMuteToggle(playerId: string): Promise<void> {
    return this.playerCommandVolumeMute(playerId, !this.players[playerId].volume_muted);
  }

  public async playerCommandGroupVolume(playerId: string, volume_level: number): Promise<void> {
    /*
      Set the group volume for a group player.
    */
    volume_level = Math.max(volume_level, 0);
    volume_level = Math.min(volume_level, 100);

    await this.sendCommand("players/cmd/group_volume", {
      player_id: playerId,
      volume_level,
    });
  }

  public playerCommandGroupVolumeUp(playerId: string): Promise<void> {
    /*
      Increase the group volume for a group player.
    */
    return this.sendCommand("players/cmd/group_volume_up", {
      player_id: playerId,
    });
  }

  public playerCommandGroupVolumeDown(playerId: string): Promise<void> {
    /*
      Decrease the group volume for a group player.
    */
    return this.sendCommand("players/cmd/group_volume_down", {
      player_id: playerId,
    });
  }

  public playerCommandGroup(playerId: string, target_player: string): Promise<void> {
    /*
      Handle GROUP command for given player.

      Join/add the given player(id) to the given (leader) player/sync group.
      If the target player itself is already synced to another player, this may fail.
      If the player can not be synced with the given target player, this may fail.

          - player_id: player_id of the player to handle the command.
          - target_player: player_id of the syncgroup leader or group player.
    */
    return this.playerCommand(playerId, "group", {
      target_player,
    });
  }

  public playerCommandUnGroup(playerId: string): Promise<void> {
    /*
      Handle UNGROUP command for given player.

      Remove the given player from any (sync)groups it currently is synced to.
      If the player is not currently grouped to any other player,
      this will silently be ignored.

          - player_id: player_id of the player to handle the command.
    */
    return this.playerCommand(playerId, "ungroup");
  }

  public playerCommandGroupMany(target_player: string, child_player_ids: string[]): Promise<void> {
    /*
      Join given player(s) to target player.
    */
    return this.sendCommand("players/cmd/group_many", {
      target_player,
      child_player_ids,
    });
  }

  public playerCommandUnGroupMany(player_ids: string[]): Promise<void> {
    /*
      Handle UNGROUP command for all the given players.
    */
    return this.sendCommand("players/cmd/ungroup_many", {
      player_ids,
    });
  }

  public playerCommandSetMembers(
    targetPlayer: string,
    playerIdsToAdd?: string[],
    playerIdsToRemove?: string[],
  ): Promise<void> {
    /*
      Join/unjoin given player(s) to/from target player.

      Will add the given player(s) to the target player (sync leader or group player).
      This is the modern API for managing group membership.

      - targetPlayer: player_id of the syncgroup leader or group player.
      - playerIdsToAdd: List of player_id's to add to the target player.
      - playerIdsToRemove: List of player_id's to remove from the target player.
    */
    return this.sendCommand("players/cmd/set_members", {
      target_player: targetPlayer,
      player_ids_to_add: playerIdsToAdd,
      player_ids_to_remove: playerIdsToRemove,
    });
  }

  public playerCommand(player_id: string, command: string, args?: Record<string, any>): Promise<void> {
    /*
      Handle command to player
    */
    return this.sendCommand(`players/cmd/${command}`, {
      player_id,
      ...args,
    });
  }

  public async createPlayerGroup(
    group_type: string,
    name: string,
    members: string[],
    dynamic = false,
  ): Promise<Player> {
    // Create a new Sync playergroup
    return this.sendCommand("player_group/create", {
      group_type,
      name,
      members,
      dynamic,
    });
  }

  public playerCommandGroupSelectSource(playerId: string, source: string): Promise<void> {
    return this.playerCommand(playerId, "select_source", { source });
  }

  // BuiltinPlayer related functions/commands

  public async registerBuiltinPlayer(player_name: string, player_id?: string): Promise<Player> {
    return this.sendCommand("builtin_player/register", {
      player_name,
      player_id,
    });
  }

  public async unregisterBuiltinPlayer(player_id: string): Promise<Player> {
    return this.sendCommand("builtin_player/unregister", { player_id });
  }

  public async updateBuiltinPlayerState(player_id: string, state: BuiltinPlayerState): Promise<boolean> {
    return this.sendCommand("builtin_player/update_state", {
      player_id,
      state,
    });
  }

  // Play Media related functions

  public playMedia(
    media: MediaItemTypeOrItemMapping | MediaItemTypeOrItemMapping[] | string | string[],
    option?: QueueOption,
    radio_mode?: boolean,
    start_item?: PlayableMediaItemType | string,
    queue_id?: string,
  ): Promise<void> {
    return this.sendCommand("player_queues/play_media", {
      queue_id,
      media,
      option,
      radio_mode,
      start_item,
    });
  }

  // ProviderConfig related functions

  public async getProviderConfigs(provider_type?: ProviderType, provider_domain?: string): Promise<ProviderConfig[]> {
    // Return all known provider configurations, optionally filtered by ProviderType or domain.
    return this.sendCommand("config/providers", {
      provider_type,
      provider_domain,
    });
  }

  public async getProviderConfig(instance_id: string): Promise<ProviderConfig> {
    // Return configuration for a single provider.
    return this.sendCommand("config/providers/get", { instance_id });
  }

  public async getProviderConfigEntries(
    provider_domain: string,
    instance_id?: string,
    action?: string,
    values?: Record<string, ConfigValueType>,
  ): Promise<ConfigEntry[]> {
    // Return Config entries to setup/configure a provider.
    // provider_domain: (mandatory) domain of the provider.
    // instance_id: id of an existing provider instance (None for new instance setup).
    // action: [optional] action key called from config entries UI.
    // values: the (intermediate) raw values for config entries sent with the action.
    return this.sendCommand("config/providers/get_entries", {
      provider_domain,
      instance_id,
      action,
      values,
    });
  }

  public async saveProviderConfig(
    provider_domain: string,
    values: Record<string, ConfigValueType>,
    instance_id?: string,
  ): Promise<ProviderConfig> {
    // Save Provider(instance) Config.
    // provider_domain: (mandatory) domain of the provider.
    // values: the raw values for config entries that need to be stored/updated.
    // instance_id: id of an existing provider instance (None for new instance setup).
    // action: [optional] action key called from config entries UI.
    return this.sendCommand("config/providers/save", {
      provider_domain,
      values,
      instance_id,
    });
  }

  public removeProviderConfig(instance_id: string): Promise<void> {
    // Remove ProviderConfig.
    return this.sendCommand("config/providers/remove", {
      instance_id,
    });
  }

  public reloadProvider(instance_id: string): Promise<void> {
    // Reload Provider(instance).
    return this.sendCommand("config/providers/reload", {
      instance_id,
    });
  }

  // PlayerConfig related functions

  public async getPlayerConfigs(provider?: string): Promise<PlayerConfig[]> {
    // Return all known player configurations, optionally filtered by provider domain.
    return this.sendCommand("config/players", { provider });
  }

  public async getPlayerConfig(player_id: string): Promise<PlayerConfig> {
    // Return configuration for a single player.
    return this.sendCommand("config/players/get", { player_id });
  }

  public async getPlayerConfigValue(player_id: string, key: string): Promise<PlayerConfig> {
    // Return single configentry value for a player.
    return this.sendCommand("config/players/get_value", { player_id, key });
  }

  public async savePlayerConfig(player_id: string, values: Record<string, ConfigValueType>): Promise<PlayerConfig> {
    // Save/update PlayerConfig.
    return this.sendCommand("config/players/save", {
      player_id,
      values,
    });
  }

  public removePlayerConfig(player_id: string): Promise<void> {
    // remove the configuration of a player
    return this.sendCommand("config/players/remove", {
      player_id,
    });
  }

  // DSP related functions

  public async getDSPConfig(player_id: string): Promise<DSPConfig> {
    // Return the DSP configuration for a player.
    return this.sendCommand("config/players/dsp/get", { player_id });
  }

  public async saveDSPConfig(player_id: string, config: DSPConfig): Promise<DSPConfig> {
    // Save/update the DSP configuration for a player.
    return this.sendCommand("config/players/dsp/save", {
      player_id,
      config,
    });
  }

  // Core Config related functions

  public async getCoreConfigs(): Promise<CoreConfig[]> {
    // Return all known core configurations
    return this.sendCommand("config/core");
  }

  public async getCoreConfig(domain: string): Promise<ProviderConfig> {
    // Return configuration for a single core controller.
    return this.sendCommand("config/core/get", { domain });
  }

  public async getCoreConfigValue(domain: string, key: string): Promise<ConfigValueType> {
    // Return value for a single core controller config entry.
    return this.sendCommand("config/core/get_value", { domain, key });
  }

  public async getCoreConfigEntries(
    domain: string,
    action?: string,
    values?: Record<string, ConfigValueType>,
  ): Promise<ConfigEntry[]> {
    // Return Config entries to configure a core controller.
    // domain: (mandatory) domain of the core module.
    // action: [optional] action key called from config entries UI.
    // values: the (intermediate) raw values for config entries sent with the action.
    return this.sendCommand("config/core/get_entries", {
      domain,
      action,
      values,
    });
  }

  public async saveCoreConfig(domain: string, values: Record<string, ConfigValueType>): Promise<ProviderConfig> {
    // Save Core controller Config.
    // domain: (mandatory) domain of the provider.
    // values: the raw values for config entries that need to be stored/updated.
    // action: [optional] action key called from config entries UI.
    return this.sendCommand("config/core/save", {
      domain,
      values,
    });
  }

  public reloadCoreController(domain: string): Promise<void> {
    // Reload Core controller.
    return this.sendCommand("config/core/reload", {
      domain,
    });
  }

  // Other (utility) functions

  public startSync(media_types?: MediaType[], providers?: string[]): Promise<void> {
    // Start running the sync of (all or selected) musicproviders.
    // media_types: only sync these media types. omit for all.
    // providers: only sync these provider domains. omit for all.
    return this.sendCommand("music/sync", { media_types, providers });
  }

  public getProviderName(provider_domain_or_instance_id: string): string {
    // try to get the name of the provider from the instance_id or domain
    if (provider_domain_or_instance_id in this.providers) {
      provider_domain_or_instance_id = this.providers[provider_domain_or_instance_id].instance_id;
    }
    // prefer the user configured name
    if (provider_domain_or_instance_id in this.providers) {
      return this.providers[provider_domain_or_instance_id].name;
    }
    // fallback to manifest name
    if (provider_domain_or_instance_id in this.providerManifests) {
      return this.providerManifests[provider_domain_or_instance_id].name;
    }
    return provider_domain_or_instance_id;
  }

  public getProvider(provider_domain_or_instance_id: string): ProviderInstance | undefined {
    // try to get the provider from the instance_id or domain
    if (provider_domain_or_instance_id in this.providers) {
      return this.providers[provider_domain_or_instance_id];
    }
    for (const provId in this.providers) {
      const prov = this.providers[provId];
      if (prov.domain == provider_domain_or_instance_id) {
        return prov;
      }
    }
    return undefined;
  }

  public getProviderManifest(provider_domain_or_instance_id: string): ProviderManifest | undefined {
    // try to get the provider manifest from the instance_id or domain
    if (provider_domain_or_instance_id in this.providerManifests) {
      return this.providerManifests[provider_domain_or_instance_id];
    }
    if (provider_domain_or_instance_id in this.providers) {
      const prov = this.providers[provider_domain_or_instance_id];
      return this.providerManifests[prov.domain];
    }
    return undefined;
  }
}
