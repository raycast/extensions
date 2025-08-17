import { getMemes } from "../api";

/**
 * Searches available meme templates based on a query string.
 * Fetches all templates and filters them by matching the query against their titles (case-insensitive).
 * Returns an array of matching Meme objects or an error object.
 */
// Define as a standard async function with explicit input and Promise return types
async function searchMemeTemplates(
  input: { query: string }, // Input type
): Promise<{ id: string; title: string; url: string; boxCount: number }[] | { error: string }> {
  // Return type
  console.log("search-meme-templates received input:", JSON.stringify(input, null, 2));

  const query = input?.query;

  // Validate the query
  if (!query || typeof query !== "string" || query.trim() === "") {
    console.log("Validation failed: query is missing, not a string, or empty.");
    return { error: "Please provide a search query." };
  }

  const normalizedQuery = query.toLowerCase().trim();
  console.log(`Validation passed. Normalized query: "${normalizedQuery}". Proceeding to search templates.`);

  try {
    // Fetch all memes first, using cache
    const { memes } = await getMemes();

    if (!memes || memes.length === 0) {
      console.log("Failed to fetch meme templates or list is empty.");
      return { error: "Could not fetch meme templates to search." };
    }

    // Filter the memes based on the query matching the title
    const matchingMemes = memes.filter((meme) => meme.title.toLowerCase().includes(normalizedQuery));

    console.log(`Found ${matchingMemes.length} templates matching "${normalizedQuery}".`);

    if (matchingMemes.length === 0) {
      return { error: `No templates found matching "${query}".` };
    }

    return matchingMemes; // Return the filtered list
  } catch (error) {
    console.error("Error searching meme templates:", error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? (error as { message: string }).message
        : "An unexpected error occurred while searching meme templates.";
    return { error: errorMessage };
  }
}

export default searchMemeTemplates;
