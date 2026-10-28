import { searchContext } from "../lib/context7";
import { packSnippets, toToolError } from "../lib/ai-budget";

type Input = {
  /** A Context7 library ID such as `/vercel/next.js`. Use search-libraries first if unknown. */
  libraryId: string;
  /** The question or task, in natural language. Context7 ranks snippets against this. */
  query: string;
};

/**
 * Context7's semantic search inside one library. The ranking is done server-side against the
 * query, so a full natural-language question works better here than keywords.
 */
export default async function getDocumentationTool(input: Input) {
  try {
    const snippets = await searchContext(input.libraryId, input.query);
    const { snippets: packed, omitted } = packSnippets(snippets, input.libraryId);

    return {
      libraryId: input.libraryId,
      returned: packed.length,
      omittedForLength: omitted,
      snippets: packed,
    };
  } catch (error) {
    return toToolError(error);
  }
}
