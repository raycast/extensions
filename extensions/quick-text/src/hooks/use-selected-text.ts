import { getSelectedText } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

/**
 * Captures the selected text from the frontmost application.
 *
 * Reads once on mount. Raycast keeps a `view` command alive in the background
 * on dismiss (no remount, no window-focus event), so reopening with a new
 * selection would show a stale value — call `reload` (wired to ⌘R) to refresh.
 * We deliberately don't poll: `getSelectedText` falls back to a synthetic copy
 * in apps without accessibility selection (e.g. VS Code), and polling would
 * fire it every tick (visible highlight flashes, Raycast 2 beta glitches).
 */
export function useSelectedText() {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setSelectedText((await getSelectedText()).trim() || null);
    } catch {
      setSelectedText(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { selectedText, isLoading, reload };
}
