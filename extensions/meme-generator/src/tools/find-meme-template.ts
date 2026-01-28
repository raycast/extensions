import { getMemes } from "../api";
import { Meme } from "../types";

/**
 * Fetches the complete list of available meme templates from Imgflip.
 * Returns an array of Meme objects or an error object.
 */
// Define as a standard async function, taking no input
async function findMemeTemplate(): Promise<Meme[] | { error: string }> {
  console.log("find-meme-template tool called (fetching all templates).");

  try {
    // Call getMemes without forceRefresh
    const { memes } = await getMemes();

    if (!memes || memes.length === 0) {
      console.log("Failed to fetch meme templates or list is empty.");
      return { error: "Could not fetch meme templates." };
    }

    console.log(`Successfully fetched ${memes.length} meme templates.`);
    return memes; // Return the full list
  } catch (error) {
    console.error("Error fetching meme templates:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message: string }).message
        : "An unexpected error occurred while fetching the meme templates.";
    return { error: errorMessage };
  }
}

export default findMemeTemplate;
