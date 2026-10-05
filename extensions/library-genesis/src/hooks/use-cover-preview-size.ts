import { useEffect, useState } from "react";

import { getCoverPreviewSize } from "@/utils/cover-preview";

export const useCoverPreviewSize = (path?: string) => {
  const [preview, setPreview] = useState<{ path: string; width: number; height: number }>();

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    getCoverPreviewSize(path, controller.signal)
      .then((size) => {
        if (!controller.signal.aborted) setPreview({ path, ...size });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [path]);

  return preview && preview.path === path ? preview : { width: 160, height: 240 };
};
