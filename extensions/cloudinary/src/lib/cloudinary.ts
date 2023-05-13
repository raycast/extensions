import { getPreferenceValues } from "@raycast/api";
import { v2 as cloudinary } from "cloudinary";

const preferences = getPreferenceValues();

cloudinary.config({
  cloud_name: preferences.cloudinaryCloudName,
  api_key: preferences.cloudinaryApiKey,
  api_secret: preferences.cloudinaryApiSecret,
  secure: true,
});

/**
 * uploadImage
 */

const EXCLUDED_KEYS = ["api_key"];

export async function uploadImage(path: string) {
  const resource = await cloudinary.uploader.upload(path, {
    folder: preferences.cloudinaryUploadFolder,
  });

  const resourceSanitized = Object.fromEntries(
    Object.entries(resource).filter(([key]) => !EXCLUDED_KEYS.includes(key))
  );

  return resourceSanitized;
}

/**
 * getImageUrl
 */

export function getImageUrl(publicId: string, options?: object) {
  return cloudinary.url(publicId, options);
}
