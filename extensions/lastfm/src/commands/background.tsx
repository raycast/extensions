import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getCurrentPlayerState } from "../services/applescript/index";
import { updateNowPlaying, scrobbleTracks, processQueue, queueScrobble } from "../services/scrobble/index";
import type { TrackInfo, PlayerState } from "../services/applescript/types";

interface Preferences {
  scrobbleInterval: string;
  minPlayDuration: string;
}

interface ScrobbleState {
  lastTrack: TrackInfo | null;
  trackStartTime: number;
  scrobbleThreshold: number; // When to scrobble (50% or 4 minutes)
  hasScrobbled: boolean;
  hasUpdatedNowPlaying: boolean;
  readyToScrobble: boolean; // Track has met threshold, ready to scrobble when it ends
  playerName?: string;
}

const STORAGE_KEY = "background_scrobble_state";

/**
 * Load the persistent scrobble state
 */
async function loadState(): Promise<ScrobbleState> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    log("Error loading state", error);
  }

  // Default state
  return {
    lastTrack: null,
    trackStartTime: 0,
    scrobbleThreshold: 0,
    hasScrobbled: false,
    hasUpdatedNowPlaying: false,
    readyToScrobble: false,
  };
}

/**
 * Save the persistent scrobble state
 */
async function saveState(state: ScrobbleState): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    log("Error saving state", error);
  }
}

/**
 * Log messages with timestamp for debugging
 */
function log(message: string, data?: unknown) {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[${timestamp}] Background: ${message}`, data);
  } else {
    console.log(`[${timestamp}] Background: ${message}`);
  }
}

/**
 * Calculate when a track should be scrobbled
 * Last.fm requires: 50% of track duration OR 4 minutes, whichever comes first
 */
function calculateScrobbleThreshold(duration: number): number {
  const halfDuration = Math.floor(duration / 2);
  const fourMinutes = 240; // 4 minutes in seconds
  return Math.min(halfDuration, fourMinutes);
}

/**
 * Check if two tracks are the same
 */
function isSameTrack(track1: TrackInfo | null, track2: TrackInfo | null): boolean {
  if (!track1 || !track2) return false;
  return track1.name === track2.name && track1.artist === track2.artist && track1.album === track2.album;
}

/**
 * Handle track change or new track detection
 */
async function handleTrackChange(track: TrackInfo, playerName: string): Promise<ScrobbleState> {
  log(`New track detected: "${track.name}" by ${track.artist}`, {
    duration: track.duration,
    album: track.album,
    player: playerName,
  });

  // Create new state for new track
  const newState: ScrobbleState = {
    lastTrack: track,
    trackStartTime: Date.now(),
    scrobbleThreshold: calculateScrobbleThreshold(track.duration),
    hasScrobbled: false,
    hasUpdatedNowPlaying: false,
    readyToScrobble: false,
    playerName,
  };

  log(`Scrobble threshold set to ${newState.scrobbleThreshold} seconds`);

  // Update Now Playing immediately
  try {
    await updateNowPlaying(track);
    newState.hasUpdatedNowPlaying = true;
    log("Updated Now Playing successfully");
  } catch (error) {
    log("Failed to update Now Playing", error);
  }

  return newState;
}

/**
 * Mark track as ready to scrobble when threshold is reached
 */
async function checkScrobbleThreshold(
  track: TrackInfo,
  playedDuration: number,
  state: ScrobbleState,
): Promise<ScrobbleState> {
  if (state.readyToScrobble) return state;

  if (playedDuration >= state.scrobbleThreshold) {
    log(`Track ready to scrobble: ${playedDuration}s >= ${state.scrobbleThreshold}s threshold`);
    return { ...state, readyToScrobble: true };
  }

  return state;
}

/**
 * Scrobble a track when it ends or changes (if it met the threshold)
 */
async function scrobbleTrackOnEnd(track: TrackInfo, state: ScrobbleState): Promise<void> {
  if (!state.readyToScrobble || state.hasScrobbled) return;

  log(`Scrobbling track on end/change: "${track.name}" by ${track.artist}`);

  try {
    // Calculate timestamp when track started playing
    const scrobbleTimestamp = Math.floor(state.trackStartTime / 1000);

    const scrobbleResult = await scrobbleTracks([
      {
        name: track.name,
        artist: track.artist,
        album: track.album,
        timestamp: scrobbleTimestamp,
        duration: track.duration,
      },
    ]);

    if (scrobbleResult.success && scrobbleResult.data) {
      log("Track scrobbled successfully", {
        accepted: scrobbleResult.data.scrobbles["@attr"].accepted,
        ignored: scrobbleResult.data.scrobbles["@attr"].ignored,
        timestamp: scrobbleTimestamp,
      });
      // Mark as scrobbled to avoid duplicates
      state.hasScrobbled = true;
      await saveState(state);
    } else {
      log("Scrobble failed", {
        error: scrobbleResult.error,
        timestamp: scrobbleTimestamp,
      });

      // Queue the scrobble to retry later (e.g., offline or auth issues)
      await queueScrobble({
        name: track.name,
        artist: track.artist,
        album: track.album,
        timestamp: scrobbleTimestamp,
        duration: track.duration,
      });
      log("Queued scrobble for retry");
      // Mark as scrobbled to avoid duplicate queueing
      state.hasScrobbled = true;
      await saveState(state);
    }
  } catch (error) {
    log("Failed to scrobble track", error);
    // Best-effort queue on unexpected errors
    try {
      const scrobbleTimestamp = Math.floor(state.trackStartTime / 1000);
      await queueScrobble({
        name: track.name,
        artist: track.artist,
        album: track.album,
        timestamp: scrobbleTimestamp,
        duration: track.duration,
      });
      log("Queued scrobble after exception for retry");
      // Mark as scrobbled to avoid duplicate queueing
      state.hasScrobbled = true;
      await saveState(state);
    } catch (e) {
      log("Failed to queue scrobble after exception", e);
    }
  }
}

/**
 * Main background processing function
 */
async function processBackground(): Promise<void> {
  try {
    // Load persistent state
    let currentState = await loadState();

    // Get current player state
    const playerState: PlayerState | null = await getCurrentPlayerState();

    if (!playerState || !playerState.isPlaying || !playerState.track) {
      // Music stopped or paused
      if (currentState.lastTrack) {
        log(`Music stopped/paused: ${playerState?.playerName || "unknown"}`);

        // Scrobble the last track if it was ready
        await scrobbleTrackOnEnd(currentState.lastTrack, currentState);

        currentState.lastTrack = null;
        await saveState(currentState);
      }
      return;
    }

    const { track, playerName } = playerState;

    // Check if this is a new track
    if (!isSameTrack(currentState.lastTrack, track)) {
      // Scrobble the previous track if it was ready
      if (currentState.lastTrack) {
        await scrobbleTrackOnEnd(currentState.lastTrack, currentState);
      }

      currentState = await handleTrackChange(track, playerName);
      await saveState(currentState);
      return;
    }

    // Same track is playing - check if it's ready to scrobble
    if (currentState.lastTrack && currentState.trackStartTime > 0) {
      const now = Date.now();
      const playedDuration = Math.floor((now - currentState.trackStartTime) / 1000);

      log(
        `Track progress: ${playedDuration}s / ${track.duration}s (${Math.round(
          (playedDuration / track.duration) * 100,
        )}%)`,
      );

      currentState = await checkScrobbleThreshold(track, playedDuration, currentState);
      await saveState(currentState);
    }
  } catch (error) {
    log("Error in background processing", error);
  }
}

/**
 * Process any queued scrobbles from previous failures
 */
async function processQueuedScrobbles() {
  try {
    const result = await processQueue();
    if (result.success && result.accepted && result.accepted > 0) {
      log(`Processed ${result.accepted} queued scrobbles`);
    }
  } catch (error) {
    log("Error processing scrobble queue", error);
  }
}

/**
 * Background command entry point
 */
export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const interval = parseInt(preferences.scrobbleInterval) || 30; // Default 30 seconds

  log("Background scrobbling started", {
    interval: `${interval}s`,
    minPlayDuration: preferences.minPlayDuration || "30s",
  });

  try {
    // Process current music state
    await processBackground();

    // Process any queued scrobbles
    await processQueuedScrobbles();

    log("Background processing completed successfully");
  } catch (error) {
    log("Background command failed", error);
  }
}
