import executeApiCommand from "./api-command";
import { showHUD, getPreferenceValues } from "@raycast/api";
import { storeSelectedQueueID, StoredQueue } from "../player-selection/use-selected-player-id";
import * as menuDisplayDelegate from "./delegates/menu-display-delegate";
import * as playerGroupingDelegate from "./delegates/player-grouping-delegate";
import * as queueFormattingDelegate from "./delegates/queue-formatting-delegate";
import { VolumeController, GroupVolumeController, PlayerVolumeController } from "./volume-strategies";
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
  MediaItemTypeOrItemMapping,
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
   * Increase the group volume on a group leader player
   *
   * @param groupLeaderId - The unique identifier of the group leader
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.groupVolumeUp("group-leader-id");
   * ```
   */
  async groupVolumeUp(groupLeaderId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandGroupVolumeUp(groupLeaderId));
  }

  /**
   * Decrease the group volume on a group leader player
   *
   * @param groupLeaderId - The unique identifier of the group leader
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.groupVolumeDown("group-leader-id");
   * ```
   */
  async groupVolumeDown(groupLeaderId: string): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandGroupVolumeDown(groupLeaderId));
  }

  /**
   * Set the group volume on a group leader player
   *
   * @param groupLeaderId - The unique identifier of the group leader
   * @param volume - The volume level to set (0-100)
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.groupSetVolume("group-leader-id", 75);
   * ```
   */
  async groupSetVolume(groupLeaderId: string, volume: number): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandGroupVolume(groupLeaderId, volume));
  }

  /**
   * Set the mute state on the specified player
   *
   * @param playerId - The unique identifier of the player to control
   * @param muted - Whether the player should be muted (true) or unmuted (false)
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * await client.volumeMute("living-room-player", true);
   * ```
   */
  async volumeMute(playerId: string, muted: boolean): Promise<void> {
    await executeApiCommand(async (api) => await api.playerCommandVolumeMute(playerId, muted));
  }

  /**
   * Create a volume controller (strategy pattern) for the specified player
   *
   * Returns the appropriate controller based on player state:
   * - GroupVolumeController for group leaders with members
   * - PlayerVolumeController for standalone players or group members
   *
   * @param playerId - The unique identifier of the player
   * @returns VolumeController instance ready to execute volume commands
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * const controller = await client.createVolumeController("living-room-player");
   * await controller.volumeUp();
   * ```
   */
  async createVolumeController(playerId: string): Promise<VolumeController> {
    const player = await this.getPlayer(playerId);
    const useGroupVolume = this.shouldUseGroupVolume(player);

    if (useGroupVolume) {
      return new GroupVolumeController(player.player_id, this);
    } else {
      const targetId = this.getVolumeControlPlayer(player);
      if (!targetId) {
        throw new Error("Unable to determine volume control target");
      }
      return new PlayerVolumeController(targetId, this);
    }
  }

  /**
   * Create a PlayerVolumeController for explicit individual volume control.
   * Use this when you explicitly want to control a single player's volume,
   * even if the player is a group leader. For automatic group/individual routing,
   * use createVolumeController() instead.
   *
   * @param playerId - The unique identifier of the player to control individually
   * @returns PlayerVolumeController instance for individual volume control
   * @throws {Error} When the API command fails or player is unavailable
   * @example
   * ```typescript
   * // Explicitly control individual speaker in a group
   * const controller = await client.createPlayerVolumeController("speaker-1");
   * await controller.volumeUp();
   * ```
   */
  async createPlayerVolumeController(playerId: string): Promise<PlayerVolumeController> {
    return new PlayerVolumeController(playerId, this);
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
    return menuDisplayDelegate.findActiveQueue(queues, storedQueueId);
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
    return menuDisplayDelegate.getDisplayTitle(queue);
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
    return menuDisplayDelegate.getCurrentlyPlayingSong(player);
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
    return menuDisplayDelegate.getQueueCurrentSong(queue);
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
    return menuDisplayDelegate.getPlayPauseButtonText(state);
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
    return menuDisplayDelegate.isPlaying(state);
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
    return menuDisplayDelegate.createQueueSelection(queue);
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
    return menuDisplayDelegate.isDisplayablePlayer(player);
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
    return menuDisplayDelegate.getDisplayableQueues(queues, players);
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
    return menuDisplayDelegate.getDisplayQueueForMenuBar(activeQueue, players, queues);
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
    return playerGroupingDelegate.getGroupMembers(player, allPlayers);
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
    return playerGroupingDelegate.formatSelectionMessage(displayName);
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
    return playerGroupingDelegate.supportsVolumeControl(player);
  }

  /**
   * Checks if a player supports mute control
   *
   * @param player - The player object to check
   * @returns True if the player supports mute control, false otherwise
   * @example
   * ```typescript
   * if (client.supportsMuteControl(player)) {
   *   // Show mute controls
   * }
   * ```
   */
  supportsMuteControl(player?: Player): boolean {
    return playerGroupingDelegate.supportsMuteControl(player);
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
    return playerGroupingDelegate.getVolumeDisplay(player);
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
    return playerGroupingDelegate.getVolumeOptions();
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
    return playerGroupingDelegate.canFormGroup(player);
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
    return playerGroupingDelegate.isGroupLeader(player);
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
    return playerGroupingDelegate.getGroupStatus(player);
  }

  /**
   * Gets the effective player ID for volume control
   *
   * When a player is part of a group (synced to another player),
   * returns the group leader's ID for group-level volume control.
   * For standalone players or group leaders, returns the player's own ID.
   *
   * @param player - The player to get volume control target for
   * @returns The player ID to use for volume control
   * @example
   * ```typescript
   * // For a member of a group
   * const speaker = { player_id: "speaker-1", synced_to: "leader-1" };
   * const target = client.getVolumeControlPlayer(speaker);
   * // Returns: "leader-1" (the group leader)
   *
   * // For a standalone player
   * const standalone = { player_id: "speaker-2", synced_to: null };
   * const target = client.getVolumeControlPlayer(standalone);
   * // Returns: "speaker-2" (the player itself)
   * ```
   */
  getVolumeControlPlayer(player?: Player): string | undefined {
    if (!player) return undefined;

    const status = this.getGroupStatus(player);

    // If player is part of a group, control the group volume via the synced-to player
    if (status === "Member") {
      return player.synced_to || player.active_group;
    }

    // For standalone players and leaders, control their own volume
    return player.player_id;
  }

  /**
   * Determines whether a player should be controlled via group volume commands
   *
   * @param player - The player to check
   * @returns True if the player is a group leader with members
   * @example
   * ```typescript
   * const leader = { player_id: "leader-1", group_childs: ["member-1"] };
   * if (client.shouldUseGroupVolume(leader)) {
   *   // Use group volume commands
   * }
   * ```
   */
  shouldUseGroupVolume(player?: Player): boolean {
    if (!player) return false;
    return this.isGroupLeader(player) && player.group_childs.length > 0;
  }

  /**
   * Syncs volume of all group members to match the group leader's volume
   *
   * @param leader - The group leader player
   * @param allPlayers - Array of all available players to find members
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.syncMembersWithLeader(leaderPlayer, allPlayers);
   * // All members now have the same volume as the leader
   * ```
   */
  async syncMembersWithLeader(leader: Player, allPlayers: Player[]): Promise<void> {
    if (!this.isGroupLeader(leader)) {
      throw new Error("Player is not a group leader");
    }

    const members = this.getGroupMembers(leader, allPlayers);
    const leaderVolume = leader.volume_level;

    if (leaderVolume === undefined) {
      throw new Error("Leader player has no volume information");
    }

    // Set all members' volumes to match the leader
    const volumePromises = members
      .filter((member) => member.player_id !== leader.player_id) // Exclude the leader from syncing
      .map((member) => this.setVolume(member.player_id, leaderVolume));

    await Promise.all(volumePromises);
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
    return playerGroupingDelegate.getCompatiblePlayers(targetPlayer, allPlayers);
  }

  /**
   * Build grouped member data for menu and list UIs
   *
   * @param targetPlayer - Group leader candidate
   * @param allPlayers - All known players
   * @returns Current group members and compatible potential members
   */
  getGroupMemberOptions(
    targetPlayer: Player,
    allPlayers: Player[],
  ): { currentMembers: Player[]; potentialMembers: Player[] } {
    return playerGroupingDelegate.getGroupMemberOptions(targetPlayer, allPlayers);
  }

  // Queue Control Methods for Current Track Command & Library Management

  /**
   * Toggle shuffle mode on a queue
   *
   * @param queueId - The queue ID to toggle shuffle on
   * @param currentShuffleEnabled - The current shuffle state
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.toggleShuffle("queue-123", true);
   * ```
   */
  async toggleShuffle(queueId: string, currentShuffleEnabled: boolean): Promise<void> {
    await executeApiCommand(async (api) => await api.queueCommandShuffleToggle(queueId, currentShuffleEnabled));
  }

  /**
   * Cycle through repeat modes: OFF → ONE → ALL → OFF
   *
   * @param queueId - The queue ID to cycle repeat mode on
   * @param currentRepeatMode - The current repeat mode
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.cycleRepeatMode("queue-123", RepeatMode.OFF);
   * ```
   */
  async cycleRepeatMode(queueId: string, currentRepeatMode: RepeatMode): Promise<void> {
    await executeApiCommand(async (api) => await api.queueCommandRepeatToggle(queueId, currentRepeatMode));
  }

  /**
   * Add a media item to favorites
   *
   * @param item - The media item or URI to add to favorites
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.addToFavorites(track);
   * ```
   */
  async addToFavorites(item: string | MediaItemType): Promise<void> {
    await executeApiCommand(async (api) => await api.addItemToFavorites(item));
  }

  /**
   * Remove a media item from favorites
   *
   * @param item - The media item to remove from favorites
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.removeFromFavorites(track);
   * ```
   */
  async removeFromFavorites(item: MediaItemType): Promise<void> {
    await executeApiCommand(async (api) => await api.removeItemFromFavorites(item.media_type, item.item_id));
  }

  /**
   * Toggle favorite state for a media item
   *
   * @param item - The media item to toggle favorite state for
   * @returns Promise that resolves to the new favorite state
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * const isNowFavorite = await client.toggleFavorite(track);
   * ```
   */
  async toggleFavorite(item: MediaItemType): Promise<boolean> {
    if (item.favorite) {
      await this.removeFromFavorites(item);
      return false;
    }

    await this.addToFavorites(item);
    return true;
  }

  /**
   * Format duration from seconds to mm:ss format
   *
   * @param seconds - Duration in seconds
   * @returns Formatted duration string (mm:ss)
   * @example
   * ```typescript
   * const duration = client.formatDuration(225); // "3:45"
   * ```
   */
  formatDuration(seconds?: number): string {
    return queueFormattingDelegate.formatDuration(seconds);
  }

  /**
   * Add an item to play next on the given queue
   *
   * @param media - Media item or mapping to enqueue
   * @param queueId - Target queue ID
   * @returns Promise that resolves when the item is queued
   * @example
   * ```typescript
   * await client.addToQueueNext(track, "queue-123");
   * ```
   */
  async addToQueueNext(media: MediaItemTypeOrItemMapping, queueId: string): Promise<void> {
    await this.playMedia(media, queueId, QueueOption.NEXT);
  }

  /**
   * Format the user-facing success message for add-to-queue-next actions
   *
   * @param itemName - Display name of the queued media item
   * @returns Formatted success message
   * @example
   * ```typescript
   * const message = client.formatAddToQueueNextMessage("Track Name");
   * // => "\"Track Name\" will play next"
   * ```
   */
  formatAddToQueueNextMessage(itemName: string): string {
    return queueFormattingDelegate.formatAddToQueueNextMessage(itemName);
  }

  /**
   * Convert a queue move direction into the API position shift value
   *
   * @param direction - Desired move direction
   * @returns Position shift for queueCommandMoveItem
   * @example
   * ```typescript
   * const shift = client.getQueueMovePositionShift("up"); // -1
   * ```
   */
  getQueueMovePositionShift(direction: "up" | "down" | "next"): number {
    return queueFormattingDelegate.getQueueMovePositionShift(direction);
  }

  /**
   * Build user-facing text for queue move actions
   *
   * @param direction - Direction used for move action
   * @returns Formatted move confirmation text
   * @example
   * ```typescript
   * const message = client.getQueueMoveFeedback("next");
   * // => "Moved to next"
   * ```
   */
  getQueueMoveFeedback(direction: "up" | "down" | "next"): string {
    return queueFormattingDelegate.getQueueMoveFeedback(direction);
  }

  /**
   * Get the display text for shuffle state
   *
   * @param shuffleEnabled - Whether shuffle is enabled
   * @returns Display text for shuffle button
   * @example
   * ```typescript
   * const text = client.getShuffleText(true); // "Shuffle: ON"
   * ```
   */
  getShuffleText(shuffleEnabled: boolean): string {
    return queueFormattingDelegate.getShuffleText(shuffleEnabled);
  }

  /**
   * Get the display text for repeat mode
   *
   * @param repeatMode - The current repeat mode
   * @returns Display text for repeat button
   * @example
   * ```typescript
   * const text = client.getRepeatText(RepeatMode.ALL); // "Repeat: ALL"
   * ```
   */
  getRepeatText(repeatMode: RepeatMode): string {
    return queueFormattingDelegate.getRepeatText(repeatMode);
  }

  /**
   * Get the next repeat mode in the OFF -> ALL -> ONE -> OFF cycle
   *
   * @param repeatMode - Current repeat mode
   * @returns Next repeat mode
   * @example
   * ```typescript
   * const next = client.getNextRepeatMode(RepeatMode.OFF); // RepeatMode.ALL
   * ```
   */
  getNextRepeatMode(repeatMode: RepeatMode): RepeatMode {
    return queueFormattingDelegate.getNextRepeatMode(repeatMode);
  }

  /**
   * Get the human-readable label for the next repeat mode in cycle order
   *
   * @param currentMode - The current repeat mode
   * @returns Label for the next mode: OFF, ONE, or ALL
   */
  getNextRepeatModeLabel(currentMode: RepeatMode): "OFF" | "ONE" | "ALL" {
    return queueFormattingDelegate.getNextRepeatModeLabel(currentMode);
  }

  /**
   * Format track display text from current media info with fallback title
   *
   * @param currentMedia - Player current media object
   * @param fallbackTitle - Fallback title when no media title exists
   * @returns Formatted text "Title - Artist" or fallback title
   */
  formatCurrentMediaTitle(currentMedia: Player["current_media"] | undefined, fallbackTitle: string): string {
    return queueFormattingDelegate.formatCurrentMediaTitle(currentMedia, fallbackTitle);
  }

  /**
   * Format volume transition text for feedback messages
   *
   * @param previous - Previous volume value
   * @param next - New volume value
   * @returns Formatted text like "Volume 50% -> 60%"
   */
  formatVolumeTransition(previous: number, next: number): string {
    return queueFormattingDelegate.formatVolumeTransition(previous, next);
  }

  // Library and Search Methods

  /**
   * Get a media item by URI
   *
   * @param uri - Media item URI
   * @returns Promise with full media item details
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * const item = await client.getItemByUri("spotify://track/123");
   * ```
   */
  async getItemByUri(uri: string): Promise<MediaItemType> {
    return await executeApiCommand(async (api) => await api.getItemByUri(uri));
  }

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
   * Add tracks to a playlist
   *
   * @param playlistId - The playlist ID to add tracks to
   * @param trackUris - Array of track URIs to add
   * @throws {Error} When the API command fails
   * @example
   * ```typescript
   * await client.addTracksToPlaylist("playlist-123", ["track-uri-1"]);
   * ```
   */
  async addTracksToPlaylist(playlistId: string | number, trackUris: string[]): Promise<void> {
    await executeApiCommand(async (api) => await api.addPlaylistTracks(playlistId, trackUris));
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
  async playMedia(
    media: MediaItemTypeOrItemMapping | MediaItemTypeOrItemMapping[] | string | string[],
    queueId: string,
    option = QueueOption.NEXT,
  ): Promise<void> {
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
      await api.queueCommandClear(queueId);
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
      await api.queueCommandDelete(queueId, itemIdOrIndex);
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
      await api.queueCommandMoveItem(queueId, queueItemId, posShift);
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
      await api.queueCommandShuffle(queueId, shuffleEnabled);
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
      await api.queueCommandRepeat(queueId, repeatMode);
    });
  }
}
