import { getPreferenceValues } from "@raycast/api";
import { v2 as cloudinary } from "cloudinary";

const preferences = getPreferenceValues();

cloudinary.config({
  cloud_name: preferences.cloudinaryCloudName,
  api_key: preferences.cloudinaryApiKey,
  api_secret: preferences.cloudinaryApiSecret,
  secure: true,
});

export async function uploadImage(path: string) {
  return cloudinary.uploader.upload(path, {
    folder: preferences.cloudinaryUploadFolder,
  });
}

export function getImageUrl(publicId: string, options?: object) {
  return cloudinary.url(publicId, options);
}
