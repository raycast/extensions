import { getImageUrl } from "./cloudinary";
import type { Asset } from "../types/asset";

/**
 * getOtherResolutions
 *
 * @param asset
 * @param optimizedUrl
 * @returns Array of resolutions
 */
export function getOtherResolutions(asset: Asset, optimizedUrl: string) {
  const ratioUrls = ["16:9", "4:3", "3:2", "1:1", "2:3", "3:4", "9:16"].map((ratio) => {
    const ratioUrl = getImageUrl(asset.public_id, {
      aspect_ratio: ratio,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto",
    });
    return {
      title: `Resized to ${ratio}`,
      icon: "url.png",
      assetUrl: ratioUrl,
      previewUrl: ratioUrl,
      detail: `![Uploaded Image ${ratio}](${ratioUrl})`,
    };
  });

  return ratioUrls;
}
