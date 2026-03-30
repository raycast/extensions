import { useCallback, useEffect, useState } from "react";
import type { ActiveSound, Preset } from "../types";
import * as presetStore from "../lib/preset-store";

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await presetStore.getAllPresets();
    setPresets(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string, sounds: ActiveSound[], masterVolume: number) => {
      const preset = await presetStore.savePreset(name, sounds, masterVolume);
      await refresh();
      return preset;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await presetStore.deletePreset(id);
      await refresh();
    },
    [refresh],
  );

  const rename = useCallback(
    async (id: string, newName: string) => {
      await presetStore.renamePreset(id, newName);
      await refresh();
    },
    [refresh],
  );

  const updateSounds = useCallback(
    async (id: string, sounds: ActiveSound[], masterVolume: number) => {
      await presetStore.updatePresetSounds(id, sounds, masterVolume);
      await refresh();
    },
    [refresh],
  );

  return { presets, isLoading, refresh, save, remove, rename, updateSounds };
}
