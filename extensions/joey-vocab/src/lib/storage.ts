import { SUPABASE_URL, IMAGE_BUCKET, AUDIO_BUCKET } from "../constants";

/**
 * Gets the public URL for an image from Supabase Storage.
 *
 * @param imagePath - Image path from dictionary entry (e.g., 'ab/cd/abcdef123456.webp')
 * @returns Public URL for the image, or null if path is empty
 */
export function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${imagePath}`;
}

/**
 * Gets the public URL for an audio file from Supabase Storage.
 *
 * @param audioPath - Audio path from dictionary entry
 * @returns Public URL for the audio file, or null if path is empty
 */
export function getAudioUrl(audioPath: string | null): string | null {
  if (!audioPath) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${AUDIO_BUCKET}/${audioPath}`;
}
