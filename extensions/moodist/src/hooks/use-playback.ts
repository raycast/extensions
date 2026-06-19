import { useCallback, useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { PlaybackState, Preset } from "../types";
import * as controller from "../lib/playback-controller";
import { DEFAULT_VOLUME } from "../lib/constants";

export function usePlayback() {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    activeSounds: [],
    masterVolume: 80,
  });
  const [isLoading, setIsLoading] = useState(true);

  const prefs = getPreferenceValues<Preferences>();
  const defaultVolume = prefs.defaultVolume ? parseInt(prefs.defaultVolume, 10) || DEFAULT_VOLUME : DEFAULT_VOLUME;

  const refresh = useCallback(async () => {
    const s = await controller.getCurrentState();
    setState(s);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const play = useCallback(async () => {
    const s = await controller.play();
    setState(s);
  }, []);

  const pause = useCallback(async () => {
    const s = await controller.pause();
    setState(s);
  }, []);

  const toggle = useCallback(async () => {
    const s = await controller.togglePlayback();
    setState(s);
  }, []);

  const addSound = useCallback(
    async (soundId: string, volume?: number) => {
      const s = await controller.addSound(soundId, volume ?? defaultVolume);
      setState(s);
    },
    [defaultVolume],
  );

  const removeSound = useCallback(async (soundId: string) => {
    const s = await controller.removeSound(soundId);
    setState(s);
  }, []);

  const toggleSound = useCallback(
    async (soundId: string) => {
      const s = await controller.toggleSound(soundId, defaultVolume);
      setState(s);
    },
    [defaultVolume],
  );

  const setVolume = useCallback(async (soundId: string, volume: number) => {
    const s = await controller.setSoundVolume(soundId, volume);
    setState(s);
  }, []);

  const setMasterVolume = useCallback(async (volume: number) => {
    const s = await controller.setMasterVolume(volume);
    setState(s);
  }, []);

  const loadPreset = useCallback(async (preset: Preset) => {
    const s = await controller.loadPreset(preset);
    setState(s);
  }, []);

  const stopAll = useCallback(async () => {
    const s = await controller.stopAll();
    setState(s);
  }, []);

  return {
    state,
    isLoading,
    refresh,
    play,
    pause,
    toggle,
    addSound,
    removeSound,
    toggleSound,
    setVolume,
    setMasterVolume,
    loadPreset,
    stopAll,
  };
}
