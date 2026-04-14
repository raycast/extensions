import { useCallback, useEffect, useState } from "react";
import { ensureDefaults } from "../defaults";
import {
  getCommandConfig,
  getModelPreset,
  saveCommandConfig,
} from "../storage";
import type { ModelPreset } from "../types";

type CommandName = "translate" | "fixspelling";
type ConfigKey = `${CommandName}_model_preset_id`;

function getConfigKey(command: CommandName): ConfigKey {
  return `${command}_model_preset_id`;
}

interface UseCommandPresetResult {
  preset: ModelPreset | undefined;
  showPicker: boolean;
  openPicker: () => void;
  handleSelectPreset: (selected: ModelPreset) => Promise<void>;
}

export function useCommandPreset(command: CommandName): UseCommandPresetResult {
  const [preset, setPreset] = useState<ModelPreset | undefined>();
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureDefaults();
      const config = await getCommandConfig();
      const key = getConfigKey(command);
      if (config?.[key]) {
        const p = await getModelPreset(config[key]);
        if (p) {
          setPreset(p);
          return;
        }
      }
      setShowPicker(true);
    })();
  }, [command]);

  const openPicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handleSelectPreset = useCallback(
    async (selected: ModelPreset) => {
      setPreset(selected);
      setShowPicker(false);
      const config = await getCommandConfig();
      const key = getConfigKey(command);
      await saveCommandConfig({
        ...config,
        [key]: selected.id,
      });
    },
    [command],
  );

  return { preset, showPicker, openPicker, handleSelectPreset };
}
