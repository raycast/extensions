import { fetchLawContent, parseArticles } from "../services/lawService";
import { Article } from "../types";

type Input = {
  /** The question asked */
  query: string;
  /** The list of laws to analyze */
  laws: {
    /** The name of the law */
    name: string;
    /** The full number of the law (e.g., "Lei nº 13.709, de 14 de agosto de 2018") */
    fullNumber: string;
    /** The URL to the law's content */
    url: string;
  }[];
};

/**
 * Retrieves all articles from the specified laws.
 * This tool fetches the content of each law and parses its articles.
 * @returns {Promise<{ lawName: string; articles: Article[] }[]>} A promise that resolves to an array of law names and their articles
 */
export default async function tool(input: Input): Promise<{ lawName: string; articles: Article[] }[]> {
  const results = [];

  for (const law of input.laws) {
    try {
      const lawData = await fetchLawContent(law.url);
      const articles = parseArticles(lawData);

      results.push({ lawName: law.name, articles });
    } catch (error) {
      console.error(`Failed to process law ${law.name}:`, error);
    }
  }

  return results;
}
