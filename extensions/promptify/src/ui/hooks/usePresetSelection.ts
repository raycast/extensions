import { useState, useEffect } from "react";
import { PresetConfig } from "../../core/types";
import { PresetManager } from "../../core/presets";
import { StorageManager } from "../../core/storage";
import { showToast, Toast } from "@raycast/api";

export interface UsePresetSelectionResult {
  selectedPreset: PresetConfig | null;
  allPresets: PresetConfig[];
  loading: boolean;
  setSelectedPreset: (preset: PresetConfig) => void;
  getPresetById: (id: string) => PresetConfig | null;
}

export function usePresetSelection(defaultPresetId?: string): UsePresetSelectionResult {
  const [selectedPreset, setSelectedPreset] = useState<PresetConfig | null>(null);
  const [allPresets, setAllPresets] = useState<PresetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  useEffect(() => {
    if (allPresets.length > 0 && !selectedPreset) {
      selectDefaultPreset();
    }
  }, [allPresets, selectedPreset]);

  const selectDefaultPreset = async () => {
    try {
      // First try the explicitly provided defaultPresetId
      if (defaultPresetId) {
        const defaultPreset = allPresets.find((p) => p.id === defaultPresetId);
        if (defaultPreset) {
          setSelectedPreset(defaultPreset);
          return;
        }
      }

      // Then try the last selected preset from settings
      const settings = await StorageManager.getSettings();
      if (settings.lastSelectedPresetId) {
        const lastPreset = allPresets.find((p) => p.id === settings.lastSelectedPresetId);
        if (lastPreset) {
          setSelectedPreset(lastPreset);
          return;
        }
      }

      // Finally fall back to the defaultPresetId or first preset
      const fallbackPreset = allPresets.find((p) => p.id === defaultPresetId) || allPresets[0];
      if (fallbackPreset) {
        setSelectedPreset(fallbackPreset);
      }
    } catch {
      // If settings fail, just use the defaultPresetId or first preset
      const fallbackPreset = allPresets.find((p) => p.id === defaultPresetId) || allPresets[0];
      if (fallbackPreset) {
        setSelectedPreset(fallbackPreset);
      }
    }
  };

  const loadPresets = async () => {
    try {
      setLoading(true);
      const presets = await PresetManager.getAllPresets();
      setAllPresets(presets);
    } catch (error) {
      showToast(Toast.Style.Failure, `Failed to load presets: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getPresetById = (id: string): PresetConfig | null => {
    return allPresets.find((p) => p.id === id) || null;
  };

  return {
    selectedPreset,
    allPresets,
    loading,
    setSelectedPreset,
    getPresetById,
  };
}
