import { readFile, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { useEffect, useState } from "react";

// Detail markdown has no corner-radius property. Wrap the selected local
// preview in an SVG mask, preserving its aspect ratio and all of its content.
// Keep this in memory: no additional copies of indexed content are saved.
async function roundedPreviewUrl(path: string, signal: AbortSignal) {
  if (!isAbsolute(path)) return undefined;
  const info = await stat(path);
  if (!info.isFile() || info.size > 10 * 1024 * 1024) return undefined;
  const data = await readFile(path, { signal });
  const { imageDimensionsFromData } = await import("image-dimensions");
  const dimensions = imageDimensionsFromData(data);
  if (!dimensions) return undefined;
  const { width, height, type } = dimensions;
  const mime = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: undefined,
    heic: undefined,
  }[type];
  // Dimensions are raw pixels. Leave potentially rotated EXIF/HEIF images
  // to Raycast so their orientation is preserved.
  if (!mime || !width || !height || data.includes(Buffer.from("Exif\0\0")))
    return undefined;
  const displayWidth = 320;
  const displayHeight = (height / width) * displayWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${displayWidth} ${displayHeight}">
  <defs><clipPath id="corners"><rect width="${displayWidth}" height="${displayHeight}" rx="12"/></clipPath></defs>
  <image width="${displayWidth}" height="${displayHeight}" href="data:${mime};base64,${data.toString("base64")}" clip-path="url(#corners)"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function useRoundedPreview(path?: string | null) {
  const [preview, setPreview] = useState<{ path: string; url: string }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    roundedPreviewUrl(path, controller.signal)
      .then((url) => {
        if (url && !controller.signal.aborted) setPreview({ path, url });
      })
      .catch(() => {
        // Keep the original preview if it cannot be rounded.
      });
    return () => controller.abort();
  }, [path]);
  return preview?.path === path ? preview?.url : undefined;
}
