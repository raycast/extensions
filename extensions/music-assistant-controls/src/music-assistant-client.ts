import executeApiCommand from "./api-command";
import { showHUD } from "@raycast/api";
import { storeSelectedQueueID, StoredQueue } from "./use-selected-player-id";
import { PlayerQueue, PlayerState, Player } from "./external-code/interfaces";

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
    return queue?.current_item?.name;
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
    return newTitle !== undefined && newTitle !== currentTitle;
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
   * // Returns: "Office Speakers selected, allow 10 seconds for the menubar to update!"
   * ```
   */
  formatSelectionMessage(displayName: string): string {
    return `${displayName} selected, allow 10 seconds for the menubar to update!`;
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
}
