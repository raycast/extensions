import { useEffect, useState } from "react";
import { GuardedImage, loadGuardedImages } from "../utils/imageFetch";

/**
 * Page-referenced images, downloaded through the network guard, as local files.
 *
 * Each image appears as soon as it lands, so a grid fills in rather than
 * waiting on its slowest file. `isLoading` stays true until every one settles.
 */
export function useGuardedImages(
  urls: readonly string[],
  pageUrl: string,
): { images: Map<string, GuardedImage>; isLoading: boolean } {
  const [images, setImages] = useState<Map<string, GuardedImage>>(new Map());
  const [isLoading, setIsLoading] = useState(urls.length > 0);
  // Identity key: callers rebuild the array on every render. JSON, not a joined
  // string, because a malformed URL can contain any separator.
  const key = JSON.stringify(urls);

  useEffect(() => {
    const list = JSON.parse(key) as string[];
    const controller = new AbortController();
    setImages(new Map());
    setIsLoading(list.length > 0);
    if (list.length === 0) return;

    loadGuardedImages(list, pageUrl, controller.signal, (url, result) => {
      if (!controller.signal.aborted) setImages((prev) => new Map(prev).set(url, result));
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    return () => controller.abort();
  }, [key, pageUrl]);

  return { images, isLoading };
}
