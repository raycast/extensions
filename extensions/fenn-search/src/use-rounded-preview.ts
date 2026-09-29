import { useEffect, useState } from "react";
import { loadPreview } from "./preview";

export function useRoundedPreview(path?: string | null): string | null {
  const [preview, setPreview] = useState<{ path: string; url: string }>();
  useEffect(() => {
    setPreview(undefined);
    if (!path) return;
    const controller = new AbortController();
    loadPreview(path, controller.signal)
      .then((url) => {
        if (url && !controller.signal.aborted) setPreview({ path, url });
      })
      .catch(() => {
        // Missing, slow, or unreadable previews never hide the search matches.
      });
    return () => controller.abort();
  }, [path]);
  return preview && preview.path === path ? preview.url : null;
}
