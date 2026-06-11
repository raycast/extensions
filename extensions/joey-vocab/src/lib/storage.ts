import { IMAGE_BUCKET, AUDIO_BUCKET } from "../constants";
import { SUPABASE_URL } from "./config";

/**
 * Builds a public URL for an object in the given Supabase Storage bucket.
 *
 * @param bucket - Storage bucket name
 * @param objectPath - Object path within the bucket
 * @returns Public URL, or null if path is empty
 */
function _getPublicStorageUrl(bucket: string, objectPath: string | null): string | null {
  if (!objectPath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/**
 * Gets the public URL for an image from Supabase Storage.
 *
 * @param imagePath - Image path from dictionary entry (e.g., 'ab/cd/abcdef123456.webp')
 * @returns Public URL for the image, or null if path is empty
 */
export function getImageUrl(imagePath: string | null): string | null {
  return _getPublicStorageUrl(IMAGE_BUCKET, imagePath);
}

/**
 * Gets the public URL for an audio file from Supabase Storage.
 *
 * @param audioPath - Audio path from dictionary entry
 * @returns Public URL for the audio file, or null if path is empty
 */
export function getAudioUrl(audioPath: string | null): string | null {
  return _getPublicStorageUrl(AUDIO_BUCKET, audioPath);
}
