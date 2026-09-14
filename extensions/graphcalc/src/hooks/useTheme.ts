import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";
import { DEFAULT_THEME_ID, THEME_IDS, ThemeId, isThemeId } from "../lib/themes";

const THEME_KEY = "theme";
/** Pre-theme storage key: a Raycast `Color` name such as "Blue". */
const LEGACY_LINE_COLOR_KEY = "lineColor";

/** Closest theme for each line color the picker used to offer. */
const LEGACY_LINE_COLOR_TO_THEME: Record<string, ThemeId> = {
  Yellow: "system",
  Green: "terminal",
  Blue: "blueprint",
  Purple: "synthwave",
  Magenta: "synthwave",
  Red: "paper",
  Orange: "paper",
};

/**
 * The selected graph theme, persisted in LocalStorage under `"theme"`.
 * Migrates the legacy `"lineColor"` key once and removes it.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const saved = await LocalStorage.getItem<string>(THEME_KEY);
      if (isThemeId(saved)) {
        if (!cancelled) setThemeState(saved);
        return;
      }
      const legacy = await LocalStorage.getItem<string>(LEGACY_LINE_COLOR_KEY);
      if (legacy === undefined) return;
      const migrated = LEGACY_LINE_COLOR_TO_THEME[legacy] ?? DEFAULT_THEME_ID;
      await LocalStorage.setItem(THEME_KEY, migrated);
      await LocalStorage.removeItem(LEGACY_LINE_COLOR_KEY);
      if (!cancelled) setThemeState(migrated);
    };
    load().catch((error) => console.error("Could not load theme:", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = (next: ThemeId) => {
    setThemeState(next);
    LocalStorage.setItem(THEME_KEY, next).catch((error) =>
      console.error("Could not save theme:", error),
    );
  };

  const nextTheme = (): ThemeId => {
    const next = THEME_IDS[(THEME_IDS.indexOf(theme) + 1) % THEME_IDS.length];
    setTheme(next);
    return next;
  };

  return { theme, setTheme, nextTheme };
}
