import { Action, Tool } from "@raycast/api";

import { searchLibraries } from "../lib/context7";
import { toToolError } from "../lib/ai-budget";
import { loadLibraryDocs } from "../lib/library-docs";
import { addLibrary, isSavedLibrary } from "../lib/my-libraries";

type Input = {
  /** A Context7 library ID such as `/vercel/next.js`. Use search-libraries first if unknown. */
  libraryId: string;
};

/** Context7 library IDs are paths: `/org/project`, optionally with a `/vN` or `@vN` suffix. */
const LIBRARY_ID_PATTERN = /^\/[^/\s]+\/[^/\s]+([/@][^/\s]+)?$/;

async function resolveLibrary(libraryId: string) {
  const { libraries } = await searchLibraries(libraryId);

  return libraries.find((candidate) => candidate.id.toLowerCase() === libraryId.toLowerCase());
}

/**
 * Saves a library to My Libraries and downloads its documentation for offline search. This
 * writes to disk and spends an API request, so it is confirmed first.
 */
export default async function addLibraryTool(input: Input) {
  const libraryId = input.libraryId?.trim() ?? "";

  if (!LIBRARY_ID_PATTERN.test(libraryId)) {
    return {
      error: `"${libraryId}" is not a Context7 library ID. IDs look like /vercel/next.js — use search-libraries to find the right one.`,
    };
  }

  try {
    // Resolved BEFORE writing: saving an unresolvable ID would leave a permanent entry that
    // can never be cached and that the user has to clean up by hand.
    const library = await resolveLibrary(libraryId);

    if (!library) {
      return {
        error: `Context7 has no library with the ID "${libraryId}". Use search-libraries to find the right one.`,
      };
    }

    await addLibrary(library);
    const docs = await loadLibraryDocs(library.id, { isSaved: true, forceRefresh: true });

    return { libraryId: library.id, name: library.name, cachedSnippets: docs.snippets.length };
  } catch (error) {
    return toToolError(error);
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Already saved: re-running is a refresh, not a new commitment, so no prompt.
  if (await isSavedLibrary(input.libraryId)) {
    return undefined;
  }

  return {
    style: Action.Style.Regular,
    message: "Add this library to My Libraries and download its documentation for offline search?",
    info: [{ name: "Library", value: input.libraryId }],
  };
};
