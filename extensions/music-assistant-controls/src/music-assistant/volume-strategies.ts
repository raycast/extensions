import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { Player } from "./external-code/interfaces";

/**
 * Abstract base class for volume control with template methods.
 * Handles all common logic including fetching players, extracting volumes, and showing toasts.
 * Subclasses implement the actual volume change operations via protected abstract methods.
 */
export abstract class VolumeController {
  protected playerId: string;
  protected client: MusicAssistantClient;

  constructor(playerId: string, client: MusicAssistantClient) {
    this.playerId = playerId;
    this.client = client;
  }

  /**
   * Increase volume by one step with automatic feedback toast
   */
  async volumeUp(): Promise<void> {
    try {
      await this.performVolumeUp();
      await this.showFeedbackToast("🔊");
    } catch (error) {
      showFailureToast(error, {
        title: "💥 Something went wrong!",
      });
    }
  }

  /**
   * Decrease volume by one step with automatic feedback toast
   */
  async volumeDown(): Promise<void> {
    try {
      await this.performVolumeDown();
      await this.showFeedbackToast("🔉");
    } catch (error) {
      showFailureToast(error, {
        title: "💥 Something went wrong!",
      });
    }
  }

  /**
   * Set volume to a specific level (0-100) with automatic feedback toast
   */
  async setVolume(level: number): Promise<void> {
    try {
      await this.performSetVolume(level);
      await this.showFeedbackToast("🔊");
    } catch (error) {
      showFailureToast(error, {
        title: "💥 Something went wrong!",
      });
    }
  }

  /**
   * Get the current volume level
   */
  async getVolume(): Promise<number> {
    const player = await this.client.getPlayer(this.playerId);
    return this.getVolumeFromPlayer(player);
  }

  /**
   * Toggle mute state - uses native mute control if available, otherwise simulates via volume
   */
  async toggleMute(): Promise<void> {
    try {
      const player = await this.client.getPlayer(this.playerId);

      if (!this.client.supportsMuteControl(player)) {
        // Fallback: simulate mute via volume control
        const currentVolume = await this.getVolume();
        const DEFAULT_UNMUTE_VOLUME = 10;

        if (currentVolume > 0) {
          await this.performSetVolume(0);
          await showToast({ style: Toast.Style.Success, title: "🔇" });
        } else {
          await this.performSetVolume(DEFAULT_UNMUTE_VOLUME);
          await showToast({ style: Toast.Style.Success, title: "🔊" });
        }
        return;
      }

      // Native mute control
      const mutedBefore = player.volume_muted ?? false;
      await this.client.volumeMute(this.playerId, !mutedBefore);

      const playerAfter = await this.client.getPlayer(this.playerId);
      const mutedAfter = playerAfter.volume_muted ?? false;
      const icon = mutedAfter ? "🔇" : "🔊";

      await showToast({ style: Toast.Style.Success, title: icon });
    } catch (error) {
      showFailureToast(error, { title: "💥 Something went wrong!" });
    }
  }

  /**
   * Perform the actual volume increase - implemented by subclasses
   */
  protected abstract performVolumeUp(): Promise<void>;

  /**
   * Perform the actual volume decrease - implemented by subclasses
   */
  protected abstract performVolumeDown(): Promise<void>;

  /**
   * Perform the actual volume set - implemented by subclasses
   */
  protected abstract performSetVolume(level: number): Promise<void>;

  /**
   * Extract the relevant volume from a player object.
   * For group controllers: returns group_volume
   * For player controllers: returns volume_level
   */
  protected abstract getVolumeFromPlayer(player: Player): number;

  /**
   * Show feedback toast with current volume
   */
  private async showFeedbackToast(emoji: string): Promise<void> {
    const player = await this.client.getPlayer(this.playerId);
    const volume = this.getVolumeFromPlayer(player);

    await showToast({
      style: Toast.Style.Success,
      title: `${emoji} Volume: ${volume}%`,
    });
  }
}

/**
 * Controls volume for group leaders using group volume commands.
 * Affects all members of the group.
 */
export class GroupVolumeController extends VolumeController {
  protected async performVolumeUp(): Promise<void> {
    await this.client.groupVolumeUp(this.playerId);
  }

  protected async performVolumeDown(): Promise<void> {
    await this.client.groupVolumeDown(this.playerId);
  }

  protected async performSetVolume(level: number): Promise<void> {
    await this.client.groupSetVolume(this.playerId, level);
  }

  protected getVolumeFromPlayer(player: Player): number {
    return player.group_volume ?? 0;
  }
}

/**
 * Controls volume for individual players or group members.
 * Affects only the specific player.
 */
export class PlayerVolumeController extends VolumeController {
  protected async performVolumeUp(): Promise<void> {
    await this.client.volumeUp(this.playerId);
  }

  protected async performVolumeDown(): Promise<void> {
    await this.client.volumeDown(this.playerId);
  }

  protected async performSetVolume(level: number): Promise<void> {
    await this.client.setVolume(this.playerId, level);
  }

  protected getVolumeFromPlayer(player: Player): number {
    return player.volume_level ?? 0;
  }
}
