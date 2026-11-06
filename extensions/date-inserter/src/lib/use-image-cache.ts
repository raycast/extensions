import { environment } from "@raycast/api";
import { useState } from "react";
import { ImageCache } from "./image-cache";

/**
 * Returns a function that renders an image for the current appearance and
 * returns its data URI, reusing earlier results. The appearance is part of the
 * key so switching between light and dark mode never shows a stale image.
 */
export function useImageCache(): (key: string, render: (dark: boolean) => string) => string {
  const [cache] = useState(() => new ImageCache());
  return (key, render) => {
    const dark = environment.appearance === "dark";
    return cache.get(`${dark ? "dark" : "light"}:${key}`, () => render(dark));
  };
}
