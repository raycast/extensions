import { getSortedVoices } from "../utils.js";

/**
 * Get available voices
 */
export default async function () {
  try {
    const voices = await getSortedVoices();
    return voices;
  } catch (error) {
    throw new Error(`Failed to get available voices: ${error}`);
  }
}
