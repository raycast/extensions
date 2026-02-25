import executeApiCommand from "./api-command";
import { showHUD, getPreferenceValues } from "@raycast/api";
import { storeSelectedQueueID, StoredQueue } from "./use-selected-player-id";
import {
  PlayerQueue,
  PlayerState,
  Player,
  Artist,
  Album,
  Track,
  Playlist,
  SearchResults,
  ItemMapping,
  QueueItem,
  QueueOption,
  RepeatMode,
  MediaItemType,
} from "./external-code/interfaces";

/**
 * Client for interacting with Music Assistant API and handling UI logic
 *
 * This class provides a comprehensive interface for controlling Music Assistant players,
 * managing queue selection, and handling UI state for menu bar and player selection components.
 *
 * Features:
 * - Player control (play, pause, next)
 * - Queue management and selection
 * - Menu bar title and state logic
 * - Player selection with user feedback
 *
 * @example
 * ```typescript
 * const client = new MusicAssistantClient();
 *
 * // Control playback
 * await client.next("player-123");
 * await client.togglePlayPause("player-123");
 *
 * // Get active queues
 * const queues = await client.getActiveQueues();
 *
 * // Handle queue selection
 * const activeQueue = client.findActiveQueue(queues, storedQueueId);
 * const title = client.getDisplayTitle(activeQueue);
 *
 * // Select a player with feedback
 * await client.selectPlayer("queue-456", "Living Room");
 * ```
 */
export default class MusicAssistantClient {
  /**
   * Advance to the next track on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.next("living-room-player");
   * ```
   */
  async next(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandNext(playerId));
  }

  /**
   * Go back to the previous track on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.previous("living-room-player");
   * ```
   */
  async previous(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandPrevious(playerId));
  }

  /**
   * Toggle play/pause state on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.togglePlayPause("kitchen-speaker");
   * ```
   */
  async togglePlayPause(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandPlayPause(playerId));
  }

  /**
   * Retrieve all active player queues that have current items
   *
   * Only returns queues that are both active and have a current item playing,
   * filtering out inactive queues and empty queues.
   *
   * @returns Promise that resolves to an array of active PlayerQueue objects
   * @throws {Error} When the API command fails or connection is lost
   * @example
   * ```typescript
   * const activeQueues = await client.getActiveQueues();
   * console.log(`Found ${activeQueues.length} active queues`);
   * ```
   */
  async getActiveQueues(): Promise<PlayerQueue[]> {
    return await executeApiCommand(async (api) => {
      const queues = await api.getPlayerQueues();
      const activeQueues = queues.filter((q) => q.active && q.current_item);
      return activeQueues;
    });
  }

  /**
   * Set the volume for the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @param volume - The volume level (0-100)
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.setVolume("living-room-player", 50);
   * ```
   */
  async setVolume(playerId: string, volume: number): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandVolumeSet(playerId, volume));
  }

  /**
   * Increase the volume on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.volumeUp("living-room-player");
   * ```
   */
  async volumeUp(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandVolumeUp(playerId));
  }

  /**
   * Decrease the volume on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.volumeDown("living-room-player");
   * ```
   */
  async volumeDown(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandVolumeDown(playerId));
  }

  /**
   * Get detailed player information including volume levels
   *
   * @param playerId - The unique identifier of the player
   * @returns Promise that resolves to Player object with full details
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * const player = await client.getPlayer("living-room-player");
   * console.log(`Volume: ${player.volume_level}%`);
   * ```
   */
  async getPlayer(playerId: string): Promise<Player> {
    return await executeApiCommand(async (api) => await api.getPlayer(playerId));
  }

  /**
   * Get all available players with their details
   *
   * @returns Promise that resolves to an array of Player objects
   * @throws {Error} When the API command fails or connection is lost
   * @example
   * ```typescript
   * const players = await client.getPlayers();
   * const volumeEnabledPlayers = players.filter(p => p.volume_control !== "none");
   * ```
   */
  async getPlayers(): Promise<Player[]> {
    return await executeApiCommand(async (api) => await api.getPlayers());
  }

  // Menu Bar Logic
  /**
   * Finds the appropriate queue to display in the menu bar
   * Uses stored queue ID if available, otherwise falls back to first queue
   *
   * @param queues - Array of available player queues
   * @param storedQueueId - Previously stored queue selection from local storage
   * @returns The queue to display, or undefined if no queues available
   * @example
   * ```typescript
   * const activeQueue = client.findActiveQueue(allQueues, { queue_id: "stored-123" });
   * if (activeQueue) {
   *   console.log(`Using queue: ${activeQueue.display_name}`);
   * }
   * ```
   */
  findActiveQueue(queues: PlayerQueue[], storedQueueId?: StoredQueue): PlayerQueue | undefined {
    if (queues.length === 0) return undefined;

    if (storedQueueId?.queue_id) {
      const storedQueue = queues.find((q) => q.queue_id === storedQueueId.queue_id);
      if (storedQueue) return storedQueue;
    }

    return queues[0];
  }

  /**
   * Extracts the display title for the menu bar from the current queue item
   * Only returns a title while the queue is actively playing
   *
   * @param queue - The player queue to extract title from
   * @returns The name of the current item, or undefined if no current item
   * @example
   * ```typescript
   * const title = client.getDisplayTitle(activeQueue);
   * if (title) {
   *   setMenuBarTitle(title);
   * }
   * ```
   */
  getDisplayTitle(queue?: PlayerQueue): string | undefined {
    if (!queue || queue.state !== PlayerState.PLAYING) {
      return undefined;
    }

    return queue.current_item?.name;
  }

  /**
   * Determines if the title should be updated based on current and new titles
   *
   * @param currentTitle - The currently displayed title
   * @param newTitle - The new title to potentially display
   * @returns True if the title should be updated, false otherwise
   * @example
   * ```typescript
   * if (client.shouldUpdateTitle(currentTitle, newTitle)) {
   *   setTitle(newTitle);
   * }
   * ```
   */
  shouldUpdateTitle(currentTitle: string | undefined, newTitle: string | undefined): boolean {
    return newTitle !== currentTitle;
  }

  /**
   * Gets the currently playing song from a player's media info
   *
   * Extracts song title and artist from player.current_media and formats them.
   * Returns an empty string if no current media is available.
   *
   * @param player - The player with current media information
   * @returns Formatted string like "Song Title - Artist" or empty string
   * @example
   * ```typescript
   * const song = client.getCurrentlyPlayingSong(player);
   * // Returns: "Bohemian Rhapsody - Queen" or ""
   * ```
   */
  getCurrentlyPlayingSong(player?: Player): string {
    if (!player?.current_media?.title) return "";
    const parts = [player.current_media.title];
    if (player.current_media.artist) {
      parts.push(player.current_media.artist);
    }
    return parts.join(" - ");
  }

  /**
   * Gets the currently playing song from a queue's current item
   *
   * Extracts and returns the name of the current queue item.
   * Returns an empty string if no current item is available.
   *
   * @param queue - The player queue with current item information
   * @returns The name of the current queue item or empty string
   * @example
   * ```typescript
   * const song = client.getQueueCurrentSong(queue);
   * // Returns: "Blinding Lights" or ""
   * ```
   */
  getQueueCurrentSong(queue?: PlayerQueue): string {
    return queue?.current_item?.name || "";
  }

  /**
   * Gets the album art URL for a player's current media
   *
   * Retrieves the image URL from the player's current media if available.
   * Returns undefined if no image is available.
   *
   * @param player - The player with current media information
   * @returns Full URL to the album art image or undefined
   * @example
   * ```typescript
   * const artUrl = client.getPlayerAlbumArt(player);
   * // Returns: "http://192.168.1.100:8095/imageproxy/..." or undefined
   * ```
   */
  getPlayerAlbumArt(player?: Player): string | undefined {
    if (!player?.current_media?.image_url) return undefined;
    return this.buildImageUrl(player.current_media.image_url);
  }

  /**
   * Gets the album art URL for a queue's current item
   *
   * Retrieves the image path from the queue's current item if available.
   * Returns undefined if no image is available.
   *
   * @param queue - The player queue with current item information
   * @returns Full URL to the album art image or undefined
   * @example
   * ```typescript
   * const artUrl = client.getQueueAlbumArt(queue);
   * // Returns: "http://192.168.1.100:8095/imageproxy/..." or undefined
   * ```
   */
  getQueueAlbumArt(queue?: PlayerQueue): string | undefined {
    const imagePath = queue?.current_item?.image?.path;
    if (!imagePath) return undefined;
    return this.buildImageUrl(imagePath);
  }

  /**
   * Builds the full image URL from a path or URL
   *
   * If the path is already a full URL (starts with http), returns it as-is.
   * Otherwise, combines it with the Music Assistant server host.
   *
   * @param pathOrUrl - The image path or URL
   * @returns Full URL to the image
   * @example
   * ```typescript
   * const url = client.buildImageUrl("/imageproxy/abc123");
   * // Returns: "http://192.168.1.100:8095/imageproxy/abc123"
   * ```
   */
  private buildImageUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http")) {
      return pathOrUrl;
    }
    const { host } = getPreferenceValues<Preferences>();
    const baseUrl = host.endsWith("/") ? host.slice(0, -1) : host;
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${baseUrl}${path}`;
  }

  /**
   * Gets the appropriate play/pause button text based on player state
   *
   * @param state - The current state of the player
   * @returns "Pause" if playing, "Play" otherwise
   * @example
   * ```typescript
   * const buttonText = client.getPlayPauseButtonText(PlayerState.PLAYING); // "Pause"
   * const buttonText2 = client.getPlayPauseButtonText(PlayerState.PAUSED); // "Play"
   * ```
   */
  getPlayPauseButtonText(state: PlayerState): string {
    return state === PlayerState.PLAYING ? "Pause" : "Play";
  }

  /**
   * Determines if the player is currently playing
   *
   * @param state - The current state of the player
   * @returns True if the player is in PLAYING state, false otherwise
   * @example
   * ```typescript
   * const icon = client.isPlaying(queue.state) ? Icon.Pause : Icon.Play;
   * ```
   */
  isPlaying(state: PlayerState): boolean {
    return state === PlayerState.PLAYING;
  }

  /**
   * Creates a queue selection result with the new title and queue ID
   *
   * @param queue - The player queue to create selection for
   * @returns Object containing the extracted title and queue ID
   * @example
   * ```typescript
   * const selection = client.createQueueSelection(selectedQueue);
   * if (selection.title) {
   *   updateTitle(selection.title);
   * }
   * storeQueueId(selection.queueId);
   * ```
   */
  createQueueSelection(queue: PlayerQueue): { title?: string; queueId: string } {
    return {
      title: this.getDisplayTitle(queue),
      queueId: queue.queue_id,
    };
  }

  /**
   * Checks if a player should be displayed in the menu bar
   *
   * A player is displayable if it is either a group leader (has members)
   * or a standalone player (not synced to another player).
   * Group members are hidden as they follow their leader's playback.
   *
   * @param player - The player to check for displayability
   * @returns True if the player should be shown in menu bar, false otherwise
   * @example
   * ```typescript
   * if (client.isDisplayablePlayer(player)) {
   *   // Show this player in the menu bar
   * }
   * ```
   */
  isDisplayablePlayer(player: Player): boolean {
    const isGroupLeader = player.group_childs && player.group_childs.length > 0;
    const isStandalone = !player.synced_to;

    return isGroupLeader || isStandalone;
  }

  /**
   * Filters queues to only include displayable players
   *
   * Returns only queues for players that are group leaders or standalone.
   * Group members are excluded since they follow their leader's playback.
   *
   * @param queues - All available player queues
   * @param players - All available players with their metadata
   * @returns Filtered list containing only displayable player queues
   * @example
   * ```typescript
   * const displayableQueues = client.getDisplayableQueues(allQueues, allPlayers);
   * // Now only shows group leaders and standalone players
   * ```
   */
  getDisplayableQueues(queues: PlayerQueue[], players: Player[]): PlayerQueue[] {
    return queues.filter((queue) => {
      const player = players.find((p) => p.player_id === queue.queue_id);
      return player && this.isDisplayablePlayer(player);
    });
  }

  /**
   * Gets the queue to display in the menu bar for the active player
   *
   * If the active queue is a group member, this returns its group leader instead.
   * This ensures the menu bar always shows a displayable player.
   *
   * @param activeQueue - The currently active queue (may be a group member)
   * @param players - All available players with their metadata
   * @param queues - All available player queues
   * @returns The queue to display in menu bar (may differ from activeQueue if it's a group member)
   * @example
   * ```typescript
   * const displayQueue = client.getDisplayQueueForMenuBar(activeQueue, allPlayers, allQueues);
   * // If activeQueue is a group member, returns the group leader's queue instead
   * ```
   */
  getDisplayQueueForMenuBar(
    activeQueue: PlayerQueue | undefined,
    players: Player[],
    queues: PlayerQueue[],
  ): PlayerQueue | undefined {
    if (!activeQueue) return undefined;

    const player = players.find((p) => p.player_id === activeQueue.queue_id);
    if (!player) return activeQueue;

    // If the player is already displayable, return it as-is
    if (this.isDisplayablePlayer(player)) {
      return activeQueue;
    }

    // If it's a group member, find and return the group leader queue
    if (player.synced_to) {
      const leaderQueue = queues.find((q) => q.queue_id === player.synced_to);
      return leaderQueue || activeQueue;
    }

    return activeQueue;
  }

  /**
   * Gets the group members for a group leader player
   *
   * Returns an array of Player objects that are members of this player's group.
   * Returns an empty array if the player is not a group leader.
   *
   * @param player - The player that may be a group leader
   * @param allPlayers - All available players to look up member details
   * @returns Array of Player objects that are group members
   * @example
   * ```typescript
   * const members = client.getGroupMembers(groupLeader, allPlayers);
   * members.forEach(member => console.log(member.display_name));
   * ```
   */
  getGroupMembers(player: Player, allPlayers: Player[]): Player[] {
    if (!player.group_childs || player.group_childs.length === 0) {
      return [];
    }

    return player.group_childs
      .map((childId) => allPlayers.find((p) => p.player_id === childId))
      .filter((p): p is Player => p !== undefined);
  }

  // Player Selection Logic
  /**
   * Selects a player queue and shows appropriate feedback
   *
   * Stores the selected queue ID in local storage and displays a HUD message
   * to inform the user about the selection and expected update time.
   *
   * @param queueId - The ID of the queue to select
   * @param displayName - The human-readable name of the player for the feedback message
   * @throws {Error} When storing the queue ID fails or showing HUD fails
   * @example
   * ```typescript
   * await client.selectPlayer("kitchen-queue-123", "Kitchen Speaker");
   * // Shows: "Kitchen Speaker selected, allow 10 seconds for the menubar to update!"
   * ```
   */
  async selectPlayer(queueId: string, displayName: string): Promise<void> {
    await storeSelectedQueueID(queueId);
    await this.showSelectionFeedback(displayName);
  }

  /**
   * Shows user feedback after player selection
   *
   * Displays a HUD message informing the user about the successful selection
   * and the expected time for the menu bar to reflect the change.
   *
   * @param displayName - The human-readable name of the selected player
   * @throws {Error} When the HUD display fails
   * @example
   * ```typescript
   * await client.showSelectionFeedback("Bedroom Speaker");
   * ```
   */
  async showSelectionFeedback(displayName: string): Promise<void> {
    await showHUD(this.formatSelectionMessage(displayName));
  }

  /**
   * Formats the success message for player selection
   *
   * @param displayName - The human-readable name of the selected player
   * @returns The formatted selection message
   * @example
   * ```typescript
   * const message = client.formatSelectionMessage("Office Speakers");
   * // Returns: "Office Speakers selected, allow 10 seconds for the menubar to update!" (macOS)
   * // Returns: "Office Speakers selected!" (Windows)
   * ```
   */
  formatSelectionMessage(displayName: string): string {
    const isMacOS = process.platform === "darwin";
    if (isMacOS) {
      return `${displayName} selected, allow 10 seconds for the menubar to update!`;
    }
    return `${displayName} selected!`;
  }

  // Volume Control Helper Methods
  /**
   * Checks if a player supports volume control
   *
   * @param player - The player object to check
   * @returns True if the player supports volume control, false otherwise
   * @example
   * ```typescript
   * if (client.supportsVolumeControl(player)) {
   *   // Show volume controls
   * }
   * ```
   */
  supportsVolumeControl(player?: Player): boolean {
    return player?.volume_control !== "none" && player?.volume_control !== undefined;
  }

  /**
   * Gets a formatted volume display string
   *
   * @param player - The player object with volume information
   * @returns Formatted volume string with percentage and mute status
   * @example
   * ```typescript
   * const volumeDisplay = client.getVolumeDisplay(player);
   * // Returns: "Volume: 75%" or "Volume: 50% (Muted)"
   * ```
   */
  getVolumeDisplay(player?: Player): string {
    if (!player || !this.supportsVolumeControl(player)) {
      return "Volume: N/A";
    }

    const level = player.volume_level ?? 0;
    const muteStatus = player.volume_muted ? " (Muted)" : "";
    return `Volume: ${level}%${muteStatus}`;
  }

  /**
   * Creates volume control menu items for common volume levels
   *
   * @returns Array of volume level options for menu display
   * @example
   * ```typescript
   * const volumeOptions = client.getVolumeOptions();
   * // Returns: [{ level: 0, display: "Mute" }, { level: 25, display: "25%" }, ...]
   * ```
   */
  getVolumeOptions(): Array<{ level: number; display: string }> {
    return [
      { level: 0, display: "Mute" },
      { level: 25, display: "25%" },
      { level: 50, display: "50%" },
      { level: 75, display: "75%" },
      { level: 100, display: "100%" },
    ];
  }

  // Player Grouping Methods
  /**
   * Set group members for a target player using the modern set_members API
   *
   * @param targetPlayer - The player ID of the group leader
   * @param playerIdsToAdd - Optional array of player IDs to add to the group
   * @param playerIdsToRemove - Optional array of player IDs to remove from the group
   * @throws {Error} When the API command fails or players are incompatible
   * @example
   * ```typescript
   * await client.setGroupMembers("leader-123", ["member-456", "member-789"]);
   * ```
   */
  async setGroupMembers(targetPlayer: string, playerIdsToAdd?: string[], playerIdsToRemove?: string[]): Promise<void> {
    await executeApiCommand(
      async (api) => await api.playerCommandSetMembers(targetPlayer, playerIdsToAdd, playerIdsToRemove),
    );
  }

  /**
   * Group a single player to a target player
   *
   * @param playerId - The player ID to add to the group
   * @param targetPlayerId - The player ID of the group leader
   * @throws {Error} When the API command fails or players are incompatible
   * @example
   * ```typescript
   * await client.groupPlayer("bedroom-speaker", "living-room-speaker");
   * ```
   */
  async groupPlayer(playerId: string, targetPlayerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandGroup(playerId, targetPlayerId));
  }

  /**
   * Remove a player from any group it's currently in
   *
   * @param playerId - The player ID to ungroup
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.ungroupPlayer("bedroom-speaker");
   * ```
   */
  async ungroupPlayer(playerId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandUnGroup(playerId));
  }

  // Player Grouping Helper Methods
  /**
   * Checks if a player can form or join groups
   *
   * @param player - The player object to check
   * @returns True if the player supports the SET_MEMBERS feature
   * @example
   * ```typescript
   * if (client.canFormGroup(player)) {
   *   // Show grouping controls
   * }
   * ```
   */
  canFormGroup(player?: Player): boolean {
    if (!player) return false;
    return player.can_group_with.length > 0;
  }

  /**
   * Checks if a player is currently a group leader
   *
   * @param player - The player object to check
   * @returns True if the player has group children
   * @example
   * ```typescript
   * if (client.isGroupLeader(player)) {
   *   // Show "Manage Group" option
   * }
   * ```
   */
  isGroupLeader(player?: Player): boolean {
    if (!player) return false;
    return player.group_childs.length > 0;
  }

  /**
   * Gets the grouping status of a player
   *
   * @param player - The player object to check
   * @returns "Leader", "Member", or "Standalone" based on the player's state
   * @example
   * ```typescript
   * const status = client.getGroupStatus(player);
   * // Returns: "Leader" if has group_childs, "Member" if synced_to, else "Standalone"
   * ```
   */
  getGroupStatus(player?: Player): "Leader" | "Member" | "Standalone" {
    if (!player) return "Standalone";

    if (this.isGroupLeader(player)) {
      return "Leader";
    }

    if (player.synced_to || player.active_group) {
      return "Member";
    }

    return "Standalone";
  }

  /**
   * Gets a list of players compatible for grouping with the target player
   *
   * @param targetPlayer - The player to find compatible players for
   * @param allPlayers - Array of all available players
   * @returns Array of players that can be grouped with the target
   * @example
   * ```typescript
   * const compatible = client.getCompatiblePlayers(leader, allPlayers);
   * // Returns only players that share grouping providers and are available
   * ```
   */
  getCompatiblePlayers(targetPlayer: Player, allPlayers: Player[]): Player[] {
    return allPlayers.filter(
      (p) =>
        p.player_id !== targetPlayer.player_id &&
        p.available &&
        p.enabled &&
        targetPlayer.can_group_with.some((provider) => p.can_group_with.includes(provider)),
    );
  }

  // Library and Search Methods

  /**
   * Perform global search for media items across all providers
   *
   * @param searchQuery - Search query string
   * @param limit - Maximum number of results to return per media type (default: 50)
   * @returns Promise with search results containing artists, albums, tracks, playlists, etc.
   * @example
   * ```typescript
   * const results = await client.search("Beatles", 50);
   * console.log(`Found ${results.artists.length} artists, ${results.albums.length} albums`);
   * ```
   */
  async search(searchQuery: string, limit = 50): Promise<SearchResults> {
    return await executeApiCommand(async (api) => await api.search(searchQuery, undefined, limit));
  }

  /**
   * Get library artists with optional filtering and pagination
   *
   * @param search - Optional search query to filter artists
   * @param limit - Maximum number of results to return
   * @param offset - Number of results to skip for pagination
   * @returns Promise with array of Artist objects
   * @example
   * ```typescript
   * const artists = await client.getLibraryArtists("Queen", 20, 0);
   * ```
   */
  async getLibraryArtists(search?: string, limit = 20, offset = 0): Promise<Artist[]> {
    return await executeApiCommand(async (api) => await api.getLibraryArtists(undefined, search, limit, offset));
  }

  /**
   * Get library albums with optional filtering and pagination
   *
   * @param search - Optional search query to filter albums
   * @param limit - Maximum number of results to return
   * @param offset - Number of results to skip for pagination
   * @returns Promise with array of Album objects
   * @example
   * ```typescript
   * const albums = await client.getLibraryAlbums("Abbey Road", 20, 0);
   * ```
   */
  async getLibraryAlbums(search?: string, limit = 20, offset = 0): Promise<Album[]> {
    return await executeApiCommand(async (api) => await api.getLibraryAlbums(undefined, search, limit, offset));
  }

  /**
   * Get library playlists with optional filtering and pagination
   *
   * @param search - Optional search query to filter playlists
   * @param limit - Maximum number of results to return
   * @param offset - Number of results to skip for pagination
   * @returns Promise with array of Playlist objects
   * @example
   * ```typescript
   * const playlists = await client.getLibraryPlaylists("Rock", 20, 0);
   * ```
   */
  async getLibraryPlaylists(search?: string, limit = 20, offset = 0): Promise<Playlist[]> {
    return await executeApiCommand(async (api) => await api.getLibraryPlaylists(undefined, search, limit, offset));
  }

  /**
   * Get albums by a specific artist
   *
   * @param itemId - The ID of the artist
   * @param providerInstanceIdOrDomain - The provider instance ID or domain
   * @returns Promise with array of Album objects
   * @example
   * ```typescript
   * const albums = await client.getArtistAlbums("artist-123", "library");
   * ```
   */
  async getArtistAlbums(itemId: string, providerInstanceIdOrDomain: string): Promise<Album[]> {
    return await executeApiCommand(async (api) => await api.getArtistAlbums(itemId, providerInstanceIdOrDomain, true));
  }

  /**
   * Get tracks in a specific album
   *
   * @param itemId - The ID of the album
   * @param providerInstanceIdOrDomain - The provider instance ID or domain
   * @returns Promise with array of Track objects
   * @example
   * ```typescript
   * const tracks = await client.getAlbumTracks("album-123", "library");
   * ```
   */
  async getAlbumTracks(itemId: string, providerInstanceIdOrDomain: string): Promise<Track[]> {
    return await executeApiCommand(async (api) => await api.getAlbumTracks(itemId, providerInstanceIdOrDomain, true));
  }

  /**
   * Get tracks in a specific playlist
   *
   * @param itemId - The ID of the playlist
   * @param providerInstanceIdOrDomain - The provider instance ID or domain
   * @returns Promise with array of Track objects
   * @example
   * ```typescript
   * const tracks = await client.getPlaylistTracks("playlist-123", "library");
   * ```
   */
  async getPlaylistTracks(itemId: string, providerInstanceIdOrDomain: string): Promise<Track[]> {
    return await executeApiCommand(
      async (api) => await api.getPlaylistTracks(itemId, providerInstanceIdOrDomain, false),
    );
  }

  /**
   * Get recently played items
   *
   * @param limit - Maximum number of items to return (default: 30)
   * @returns Promise with array of ItemMapping objects
   * @example
   * ```typescript
   * const recent = await client.getRecentlyPlayedItems(30);
   * ```
   */
  async getRecentlyPlayedItems(limit = 30): Promise<ItemMapping[]> {
    return await executeApiCommand(async (api) => await api.getRecentlyPlayedItems(limit));
  }

  /**
   * Get queue items for a specific player queue
   *
   * @param queueId - The ID of the queue
   * @param limit - Maximum number of items to return
   * @param offset - Number of items to skip for pagination
   * @returns Promise with array of QueueItem objects
   * @example
   * ```typescript
   * const queueItems = await client.getPlayerQueueItems("queue-123", 100, 0);
   * ```
   */
  async getPlayerQueueItems(queueId: string, limit = 100, offset = 0): Promise<QueueItem[]> {
    return await executeApiCommand(async (api) => await api.getPlayerQueueItems(queueId, limit, offset));
  }

  /**
   * Play media items on a specific queue
   *
   * @param media - Media item(s) to play
   * @param queueId - The ID of the queue to play on
   * @param option - Queue option (PLAY, NEXT, ADD, etc.)
   * @returns Promise that resolves when playback starts
   * @example
   * ```typescript
   * await client.playMedia(track, "queue-123", QueueOption.NEXT);
   * ```
   */
  async playMedia(media: MediaItemType, queueId: string, option = QueueOption.NEXT): Promise<void> {
    return await executeApiCommand(async (api) => await api.playMedia(media, option, false, undefined, queueId));
  }

  /**
   * Clear all items from a queue
   *
   * @param queueId - The ID of the queue to clear
   * @returns Promise that resolves when queue is cleared
   * @example
   * ```typescript
   * await client.queueCommandClear("queue-123");
   * ```
   */
  async queueCommandClear(queueId: string): Promise<void> {
    return await executeApiCommand(async (api) => {
      api.queueCommandClear(queueId);
    });
  }

  /**
   * Delete an item from a queue
   *
   * @param queueId - The ID of the queue
   * @param itemIdOrIndex - The queue item ID or index to delete
   * @returns Promise that resolves when item is deleted
   * @example
   * ```typescript
   * await client.queueCommandDelete("queue-123", "item-456");
   * ```
   */
  async queueCommandDelete(queueId: string, itemIdOrIndex: string | number): Promise<void> {
    return await executeApiCommand(async (api) => {
      api.queueCommandDelete(queueId, itemIdOrIndex);
    });
  }

  /**
   * Move an item in the queue
   *
   * @param queueId - The ID of the queue
   * @param queueItemId - The queue item ID to move
   * @param posShift - Number of positions to move (positive = down, negative = up, 0 = next)
   * @returns Promise that resolves when item is moved
   * @example
   * ```typescript
   * await client.queueCommandMoveItem("queue-123", "item-456", -1); // Move up
   * ```
   */
  async queueCommandMoveItem(queueId: string, queueItemId: string, posShift: number): Promise<void> {
    return await executeApiCommand(async (api) => {
      api.queueCommandMoveItem(queueId, queueItemId, posShift);
    });
  }

  /**
   * Get the current queue for a player
   *
   * @param queueId - The ID of the queue
   * @returns Promise with PlayerQueue object
   * @example
   * ```typescript
   * const queue = await client.getPlayerQueue("queue-123");
   * console.log(`Shuffle: ${queue.shuffle_enabled}, Repeat: ${queue.repeat_mode}`);
   * ```
   */
  async getPlayerQueue(queueId: string): Promise<PlayerQueue> {
    return await executeApiCommand(async (api) => await api.getPlayerQueue(queueId));
  }

  /**
   * Toggle shuffle on a queue
   *
   * @param queueId - The ID of the queue
   * @param shuffleEnabled - Whether to enable shuffle
   * @returns Promise that resolves when shuffle is toggled
   * @example
   * ```typescript
   * await client.queueCommandShuffle("queue-123", true);
   * ```
   */
  async queueCommandShuffle(queueId: string, shuffleEnabled: boolean): Promise<void> {
    return await executeApiCommand(async (api) => {
      api.queueCommandShuffle(queueId, shuffleEnabled);
    });
  }

  /**
   * Set repeat mode on a queue
   *
   * @param queueId - The ID of the queue
   * @param repeatMode - The repeat mode to set
   * @returns Promise that resolves when repeat mode is set
   * @example
   * ```typescript
   * await client.queueCommandRepeat("queue-123", RepeatMode.ALL);
   * ```
   */
  async queueCommandRepeat(queueId: string, repeatMode: RepeatMode): Promise<void> {
    return await executeApiCommand(async (api) => {
      api.queueCommandRepeat(queueId, repeatMode);
    });
  }
}
