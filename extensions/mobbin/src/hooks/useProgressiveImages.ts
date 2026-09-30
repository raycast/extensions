import { useEffect, useRef } from "react";
import { loadReferenceImagesSequentially } from "../lib/progressive-images";
import type { MobbinReference } from "../lib/types";

type Props = {
  references: MobbinReference[];
  loadedPaths: ReadonlyMap<string, string>;
  onLoaded: (key: string, imagePath: string) => void;
  priorityKey?: string;
};

export function useProgressiveImages({
  references,
  loadedPaths,
  onLoaded,
  priorityKey,
}: Props): void {
  const loadedPathsRef = useRef(loadedPaths);
  loadedPathsRef.current = loadedPaths;

  useEffect(() => {
    const controller = new AbortController();
    void loadReferenceImagesSequentially(references, {
      signal: controller.signal,
      loadedKeys: new Set(loadedPathsRef.current.keys()),
      onLoaded,
      ...(priorityKey ? { priorityKey } : {}),
    });
    return () => controller.abort();
  }, [onLoaded, priorityKey, references]);
}
