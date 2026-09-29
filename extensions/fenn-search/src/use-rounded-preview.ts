import { useEffect, useState } from "react";
import { loadPreview, nativePreviewUrl } from "./preview";

export function useRoundedPreview(path?: string | null): string | null {
  const [preview, setPreview] = useState<{ path: string; url: string | null }>();
  useEffect(() => {
    setPreview(undefined);
    if (!path) return;
    const controller = new AbortController();
    loadPreview(path, controller.signal)
      .then((url) => {
        if (!controller.signal.aborted) setPreview({ path, url: url ?? null });
      })
      .catch((error: NodeJS.ErrnoException) => {
        // Hide a confirmed missing/unreadable file, but keep the native URL
        // for transient failures. Never apply a stale selection's result.
        if (!controller.signal.aborted && ["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code ?? "")) {
          setPreview({ path, url: null });
        }
      });
    return () => controller.abort();
  }, [path]);
  return preview && preview.path === path ? preview.url : path ? (nativePreviewUrl(path) ?? null) : null;
}
