import { useCallback, useEffect, useState } from "react";
import { getEffectiveSettings } from "./settings";
import { EffectiveSettings } from "./types";

const fallbackSettings: EffectiveSettings = {
  muteBehavior: "optimistic-toggle",
  undoTtlSeconds: 10,
  undoTtlMs: 10000,
  increaseStep: 1,
  decreaseStep: 1,
  volumePrimaryAction: "increase",
  sectionOrder: "buses-first",
};

export function useEffectiveSettings() {
  const [settings, setSettings] = useState<EffectiveSettings>(fallbackSettings);

  const refreshSettings = useCallback(async () => {
    const next = await getEffectiveSettings();
    setSettings(next);
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return { settings, refreshSettings };
}
