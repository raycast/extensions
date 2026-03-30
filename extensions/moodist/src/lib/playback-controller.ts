import { environment } from "@raycast/api";
import { AudioEngine } from "./audio-engine";
import { getPlaybackState, setPlaybackState } from "./playback-state";
import { getSoundById, getSoundFilePath } from "./sound-library";
import type { PlaybackState, Preset } from "../types";

let engineInstance: AudioEngine | null = null;

function getEngine(): AudioEngine {
  if (!engineInstance) {
    engineInstance = new AudioEngine(environment.supportPath);
  }
  return engineInstance;
}

function effectiveVolume(soundVolume: number, masterVolume: number): number {
  return Math.round((soundVolume / 100) * (masterVolume / 100) * 100);
}

export async function reconcile(): Promise<void> {
  const engine = getEngine();
  const state = await getPlaybackState();
  const running = engine.getRunningEntries();
  const runningIds = new Set(running.map((r) => r.soundId));

  if (!state.isPlaying) {
    // Should not be playing - stop everything
    if (running.length > 0) {
      engine.stopAll();
    }
    return;
  }

  // Start sounds that should be playing but aren't
  for (const as of state.activeSounds) {
    const sound = getSoundById(as.soundId);
    if (!sound) continue;

    const targetVol = effectiveVolume(as.volume, state.masterVolume);

    if (!runningIds.has(as.soundId)) {
      engine.startSound(as.soundId, getSoundFilePath(sound), targetVol);
    } else {
      // Check if volume needs updating
      const entry = running.find((r) => r.soundId === as.soundId);
      if (entry && Math.abs(entry.volume - targetVol) > 2) {
        engine.changeVolume(as.soundId, getSoundFilePath(sound), targetVol);
      }
    }
  }

  // Stop sounds that are running but shouldn't be
  const desiredIds = new Set(state.activeSounds.map((s) => s.soundId));
  for (const entry of running) {
    if (!desiredIds.has(entry.soundId)) {
      engine.stopSound(entry.soundId);
    }
  }
}

export async function play(): Promise<PlaybackState> {
  const state = await getPlaybackState();
  state.isPlaying = true;
  await setPlaybackState(state);
  await reconcile();
  return state;
}

export async function pause(): Promise<PlaybackState> {
  const engine = getEngine();
  engine.stopAll();
  const state = await getPlaybackState();
  state.isPlaying = false;
  await setPlaybackState(state);
  return state;
}

export async function togglePlayback(): Promise<PlaybackState> {
  const state = await getPlaybackState();
  if (state.isPlaying) {
    return pause();
  } else {
    return play();
  }
}

export async function addSound(soundId: string, volume: number): Promise<PlaybackState> {
  const state = await getPlaybackState();
  const existing = state.activeSounds.find((s) => s.soundId === soundId);
  if (existing) {
    existing.volume = volume;
  } else {
    state.activeSounds.push({ soundId, volume });
  }
  // Auto-play when adding sounds
  state.isPlaying = true;
  await setPlaybackState(state);
  await reconcile();
  return state;
}

export async function removeSound(soundId: string): Promise<PlaybackState> {
  const engine = getEngine();
  engine.stopSound(soundId);
  const state = await getPlaybackState();
  state.activeSounds = state.activeSounds.filter((s) => s.soundId !== soundId);
  await setPlaybackState(state);
  return state;
}

export async function setSoundVolume(soundId: string, volume: number): Promise<PlaybackState> {
  const state = await getPlaybackState();
  const sound = state.activeSounds.find((s) => s.soundId === soundId);
  if (sound) {
    sound.volume = volume;
    await setPlaybackState(state);
    if (state.isPlaying) {
      await reconcile();
    }
  }
  return state;
}

export async function setMasterVolume(volume: number): Promise<PlaybackState> {
  const state = await getPlaybackState();
  state.masterVolume = volume;
  await setPlaybackState(state);
  if (state.isPlaying) {
    await reconcile();
  }
  return state;
}

export async function loadPreset(preset: Preset): Promise<PlaybackState> {
  const engine = getEngine();
  engine.stopAll();
  const state = await getPlaybackState();
  state.activeSounds = [...preset.sounds];
  state.masterVolume = preset.masterVolume;
  state.isPlaying = true;
  await setPlaybackState(state);
  await reconcile();
  return state;
}

export async function stopAll(): Promise<PlaybackState> {
  return pause();
}

export async function getCurrentState(): Promise<PlaybackState> {
  return getPlaybackState();
}

export async function toggleSound(soundId: string, defaultVolume: number): Promise<PlaybackState> {
  const state = await getPlaybackState();
  const existing = state.activeSounds.find((s) => s.soundId === soundId);
  if (existing) {
    return removeSound(soundId);
  } else {
    return addSound(soundId, defaultVolume);
  }
}
