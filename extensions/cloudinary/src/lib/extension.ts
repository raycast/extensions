import { getImageUrl } from "./cloudinary";
import type { Asset } from "../types/asset";

/**
 * getUploadSuccessItems
 */

export function getUploadSuccessItems(asset: Asset) {
  if (typeof asset.public_id !== "string") {
    throw new Error("Failed to get items: Invalid Asset.");
  }

  const optimizedUrl = getImageUrl(asset.public_id, {
    quality: "auto",
    fetch_format: "auto",
  });

  const backgroundRemovedUrl = getImageUrl(asset.public_id, {
    effect: "background_removal",
    quality: "auto",
    fetch_format: "auto",
  });

  return [
    {
      title: "Optimized",
      icon: "url.png",
      assetUrl: optimizedUrl,
      previewUrl: optimizedUrl,
      detail: `![Uploaded Image Optimized](${optimizedUrl})`,
    },
    {
      title: "Background Removed",
      icon: "url.png",
      assetUrl: backgroundRemovedUrl,
      previewUrl: optimizedUrl,
      detail: `![Uploaded Image with Background Removed](${optimizedUrl})`,
    },
    {
      title: "Raw",
      icon: "url.png",
      assetUrl: asset.secure_url,
      previewUrl: optimizedUrl,
      detail: `![Uploaded Image Raw](${optimizedUrl})`,
    },
  ];
}
