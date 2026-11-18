/**
 * Async thumbnail resolution for event list detail panes.
 *
 * @module hooks/use-event-thumbnail
 */

import { useEffect, useState } from "react";
import { resolveEventThumbnail } from "../lib/thumbnail";
import type { TeslaEvent } from "../types";

/**
 * Loads a preview image path for an event using ffmpeg when needed.
 *
 * @param event - Event whose first segment is used for the thumbnail.
 * @param ffmpegPath - Resolved ffmpeg executable path.
 * @returns Local filesystem path to a thumbnail image, or `undefined` while loading or on failure.
 */
export function useEventThumbnail(event: TeslaEvent, ffmpegPath: string): string | undefined {
  const [thumbnailPath, setThumbnailPath] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function loadThumbnail(): Promise<void> {
      try {
        const path = await resolveEventThumbnail(event, ffmpegPath);
        if (!cancelled) {
          setThumbnailPath(path);
        }
      } catch {
        if (!cancelled) {
          setThumbnailPath(undefined);
        }
      }
    }

    void loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [event, ffmpegPath]);

  return thumbnailPath;
}
