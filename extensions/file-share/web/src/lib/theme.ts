import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "file-share-theme";

function isChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** The saved choice, defaulting to following the system. */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice === "system") return prefersDark() ? "dark" : "light";
  return choice;
}

/** The whole theming contract with the stylesheet: one attribute on <html>. */
export function applyTheme(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolveTheme(choice);
}

export function useTheme(): { choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void } {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private browsing can refuse storage; the page still follows the choice for this visit.
    }
  }, [choice]);

  // While the choice is "system", an OS switch has to reach the page too.
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  return { choice, setChoice };
}
