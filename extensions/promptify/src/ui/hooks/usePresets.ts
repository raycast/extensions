import { useState, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { PresetConfig } from "../../core/types";
import { PresetManager } from "../../core/presets";
import { generateId } from "../../utils/helpers";

export interface UsePresetEditorResult {
  preset: Partial<PresetConfig>;
  setPreset: (preset: Partial<PresetConfig>) => void;
  updateField: <K extends keyof PresetConfig>(key: K, value: PresetConfig[K]) => void;
  validation: { valid: boolean; errors: string[] };
  isDirty: boolean;
  preview: string;
  save: () => Promise<boolean>;
  reset: () => void;
}

export function usePresetEditor(initialPreset?: Partial<PresetConfig>): UsePresetEditorResult {
  const [preset, setPreset] = useState<Partial<PresetConfig>>(
    initialPreset || {
      name: "",
      description: "",
      systemPrompt: "",
      tags: [],
    },
  );

  const [originalPreset] = useState<Partial<PresetConfig>>(initialPreset || {});

  const updateField = useCallback(<K extends keyof PresetConfig>(key: K, value: PresetConfig[K]) => {
    setPreset((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validation = PresetManager.validatePreset(preset);
  const isDirty = JSON.stringify(preset) !== JSON.stringify(originalPreset);

  const preview = preset.systemPrompt
    ? PresetManager.renderPreset(preset as PresetConfig, {
        input: "Sample input text",
        topic: "example topic",
        style: "professional",
      })
    : "";

  const save = useCallback(async (): Promise<boolean> => {
    if (!validation.valid) {
      showToast(Toast.Style.Failure, `Cannot save: ${validation.errors.join(", ")}`);
      return false;
    }

    try {
      const fullPreset: PresetConfig = {
        id: preset.id || generateId("preset"),
        name: preset.name!,
        description: preset.description || "",
        systemPrompt: preset.systemPrompt!,
        tags: preset.tags || [],
        isBuiltIn: false,
        examples: preset.examples || [],
        createdAt: preset.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await PresetManager.saveCustomPreset(fullPreset);
      showToast(Toast.Style.Success, "Preset saved successfully");
      return true;
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to save preset: ${error}`);
      return false;
    }
  }, [preset, validation]);

  const reset = useCallback(() => {
    setPreset(originalPreset);
  }, [originalPreset]);

  return {
    preset,
    setPreset,
    updateField,
    validation,
    isDirty,
    preview,
    save,
    reset,
  };
}
