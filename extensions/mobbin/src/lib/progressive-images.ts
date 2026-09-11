import { cacheMobbinReferenceImage, isImageExpired } from "./image-cache";
import type { MobbinReference, ReferenceImage } from "./types";

export function referenceKey(reference: MobbinReference): string {
  return `${reference.kind}:${reference.id}`;
}

export function referenceImage(
  reference: MobbinReference,
): ReferenceImage | undefined {
  return reference.kind === "flow" ? reference.coverImage : reference.image;
}

export async function loadReferenceImagesSequentially(
  references: MobbinReference[],
  options: {
    signal: AbortSignal;
    loadedKeys: ReadonlySet<string>;
    onLoaded: (key: string, imagePath: string) => void;
    priorityKey?: string;
    loadImage?: (
      reference: MobbinReference,
      signal: AbortSignal,
    ) => Promise<string>;
  },
): Promise<void> {
  const loadImage = options.loadImage ?? cacheMobbinReferenceImage;
  const loadedKeys = new Set(options.loadedKeys);
  const ordered = [...references];
  if (options.priorityKey) {
    ordered.sort((left, right) => {
      const leftPriority = referenceKey(left) === options.priorityKey ? 0 : 1;
      const rightPriority = referenceKey(right) === options.priorityKey ? 0 : 1;
      return leftPriority - rightPriority;
    });
  }

  for (const reference of ordered) {
    if (options.signal.aborted) return;
    const key = referenceKey(reference);
    const image = referenceImage(reference);
    if (
      loadedKeys.has(key) ||
      image?.localPath ||
      !image ||
      (!image.url && !image.dataUrl) ||
      isImageExpired(image)
    ) {
      continue;
    }

    try {
      const imagePath = await loadImage(reference, options.signal);
      if (options.signal.aborted) return;
      loadedKeys.add(key);
      options.onLoaded(key, imagePath);
    } catch {
      if (options.signal.aborted) return;
      // Keep the placeholder and continue with the next result.
    }
  }
}
