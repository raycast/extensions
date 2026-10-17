import { useEffect, useState } from "preact/hooks";

const STORAGE_KEY = "lan-file-share-theme";

function isChoice(value) {
  return value === "system" || value === "light" || value === "dark";
}

/** The saved choice, defaulting to following the system. */
export function readThemeChoice() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(choice) {
  if (choice === "system") return prefersDark() ? "dark" : "light";
  return choice;
}

/** The whole theming contract with the stylesheet: one attribute on <html>. */
export function applyTheme(choice) {
  document.documentElement.dataset.theme = resolveTheme(choice);
}

export function useTheme() {
  const [choice, setChoice] = useState(readThemeChoice);

  useEffect(() => {
    applyTheme(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Private browsing can refuse storage; the page still follows the choice for this visit.
    }
  }, [choice]);

  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  return { choice, setChoice };
}
