import { getMyLibraries } from "../lib/my-libraries";
import { loadAllCachedDocs, prepareSearchIndex, searchIndex } from "../lib/library-docs";
import { packSnippets, toToolError } from "../lib/ai-budget";

type Input = {
  /** Words to match against the user's saved documentation. */
  query: string;
};

/**
 * Searches only the libraries the user has saved, from the local cache. No network, no API
 * quota, and it works offline — prefer it when the question plausibly concerns something the
 * user already keeps, and fall back to search-libraries + get-documentation otherwise.
 */
export default async function searchMyLibrariesTool(input: Input) {
  try {
    const libraries = await getMyLibraries();

    if (libraries.length === 0) {
      return {
        savedLibraries: 0,
        returned: 0,
        snippets: [],
        note: "The user has no saved libraries. Use search-libraries and get-documentation instead.",
      };
    }

    const { snippets, uncached } = await loadAllCachedDocs(libraries);
    const matches = searchIndex(prepareSearchIndex(snippets), input.query);
    const { snippets: packed, omitted } = packSnippets(matches, "");

    return {
      savedLibraries: libraries.length,
      librariesWithoutCache: uncached.length,
      returned: packed.length,
      omittedForLength: omitted,
      snippets: packed,
    };
  } catch (error) {
    return toToolError(error);
  }
}
