import { fetchApiIndex, searchApiItems } from "../utils/fetch-api";

type Input = {
	/**
	 * The search query to find relevant Effect API functions, modules, or types
	 */
	query: string;
};

/**
 * Search Effect-TS API reference for functions, modules, and types.
 * Use this when the user asks about a named API, type signatures, or implementation details.
 * Examples: "what does Effect.gen do", "how does Layer work in Effect"
 */
export default async function tool(input: Input) {
	try {
		const items = await fetchApiIndex();
		const results = searchApiItems(items, input.query);

		return results.slice(0, 10).map((item) => ({
			name: item.name,
			module: item.module,
			url: item.url,
		}));
	} catch (error: unknown) {
		return {
			error: error instanceof Error ? error.message : "Failed to search API",
		};
	}
}
