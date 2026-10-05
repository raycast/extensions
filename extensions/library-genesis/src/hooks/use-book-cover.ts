import { useEffect, useState } from "react";

import { environment } from "@raycast/api";

import { getCachedBookCover, getCachedFullSizeBookCover } from "@/utils/api/covers";

export const useBookCover = (coverUrl: string, fullSize = false) => {
  const hasCover = coverUrl !== "N/A";
  const [cover, setCover] = useState<{ url: string; path?: string }>();

  useEffect(() => {
    if (!hasCover) return;
    const controller = new AbortController();
    const fetchCover = fullSize ? getCachedFullSizeBookCover : getCachedBookCover;
    fetchCover(coverUrl, environment.supportPath, controller.signal)
      .then((path) => {
        if (!controller.signal.aborted) setCover({ url: coverUrl, path });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCover({ url: coverUrl });
      });
    return () => controller.abort();
  }, [coverUrl, hasCover, fullSize]);

  return {
    path: cover?.url === coverUrl ? cover.path : undefined,
    loading: hasCover && cover?.url !== coverUrl,
  };
};
