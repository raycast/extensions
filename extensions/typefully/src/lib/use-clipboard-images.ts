import { useEffect, useRef } from "react";
import { cleanupUnusedClipboardImages, readClipboardImage, removeClipboardImages } from "./clipboard-images";

export function useClipboardImages(images: string[], preserveDrafts: boolean) {
  const initialImages = useRef(images);
  const currentImages = useRef(images);
  const mounted = useRef(true);
  currentImages.current = images;

  useEffect(() => {
    mounted.current = true;
    // Only the top-level command receives saved Raycast drafts. Nested forms must
    // not prune files that might belong to that saved draft.
    if (preserveDrafts) void cleanupUnusedClipboardImages(initialImages.current);

    return () => {
      mounted.current = false;
      if (!preserveDrafts) void removeClipboardImages(currentImages.current);
    };
  }, [preserveDrafts]);

  return async () => {
    const image = await readClipboardImage();
    if (!mounted.current) {
      // The user may leave while native clipboard reading is still in flight.
      await removeClipboardImages([image]);
      return undefined;
    }
    currentImages.current = [...currentImages.current, image];
    return image;
  };
}
