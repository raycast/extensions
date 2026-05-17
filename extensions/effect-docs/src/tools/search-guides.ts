import { fetchGuideIndex, searchGuideItems } from "../utils/fetch-guides";

type Input = {
	/**
	 * The search query to find relevant Effect guides
	 */
	query: string;
};

/**
 * Search Effect-TS guides and documentation for relevant articles and topics.
 * Use this when the user asks about patterns, concepts, best practices, or 'how to' questions.
 * Examples: "how do I handle errors in Effect", "what is the Effect pattern for dependency injection"
 */
export default async function tool(input: Input) {
	try {
		const items = await fetchGuideIndex();
		const results = searchGuideItems(items, input.query);

		return results.slice(0, 10).map((item) => ({
			title: item.title,
			description: item.description,
			url: item.url,
			section: item.section,
		}));
	} catch (error: unknown) {
		return {
			error: error instanceof Error ? error.message : "Failed to search guides",
		};
	}
}
