import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

type ViewMode = "list" | "grid";

export function useViewMode(key: string, defaultMode: ViewMode = "list") {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    LocalStorage.getItem<string>(`viewMode-${key}`).then((stored) => {
      if (stored === "list" || stored === "grid") setMode(stored);
    });
  }, [key]);

  const toggle = async () => {
    const next: ViewMode = mode === "list" ? "grid" : "list";
    setMode(next);
    await LocalStorage.setItem(`viewMode-${key}`, next);
  };

  return { mode, toggle } as const;
}
