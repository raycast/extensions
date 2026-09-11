import { searchLibraries } from "../lib/context7";
import { packItems, toToolError, truncate } from "../lib/ai-budget";

type Input = {
  /** What the user is looking for — a library, framework, SDK, or documentation site. */
  query: string;
};

/**
 * Resolves a human name ("Next.js", "tailwind") to Context7 library IDs. Almost every other
 * tool needs an ID, and IDs are not guessable — `/vercel/next.js`, `/websites/tailwindcss`,
 * `/llmstxt/developers_raycast_llms_txt` — so this is normally the first call.
 */
export default async function searchLibrariesTool(input: Input) {
  try {
    const { libraries } = await searchLibraries(input.query);

    // Descriptions are unbounded, so the list is capped by serialized size like every other
    // tool return, not by row count alone.
    const { items, omitted } = packItems(
      libraries.map((library) => ({
        id: library.id,
        name: library.name,
        description: library.description ? truncate(library.description, 300) : undefined,
        trustScore: library.trustScore,
        snippets: library.totalSnippets,
        lastUpdated: library.lastUpdateDate,
      })),
    );

    return { count: libraries.length, returned: items.length, omittedForLength: omitted, libraries: items };
  } catch (error) {
    return toToolError(error);
  }
}
