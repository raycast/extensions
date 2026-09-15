import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  settingsPreferenceFingerprint,
  type AcademicSettings,
} from "../lib/settings";
import type { ExtensionPreferences } from "../preferences";

export function useAcademicSettings(): {
  settings: AcademicSettings;
  isLoading: boolean;
  reload: () => void;
} {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const preferencesFingerprint = settingsPreferenceFingerprint(preferences);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let disposed = false;
    void loadSettings(preferences).then((value) => {
      if (!disposed) {
        setSettings(value);
        setIsLoading(false);
      }
    });
    return () => {
      disposed = true;
    };
  }, [revision, preferencesFingerprint]);

  return {
    settings,
    isLoading,
    reload: () => setRevision((value) => value + 1),
  };
}
