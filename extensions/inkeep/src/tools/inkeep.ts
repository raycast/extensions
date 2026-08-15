import { getInkeepCompletion } from "../services/inkeep";

type Input = {
  /** Question to ask Inkeep to which it will respond with a detailed answer grounded in documentation */
  searchQuery: string;
};

export default async function (input: Input): Promise<string> {
  try {
    // Call the Inkeep API
    const response = await getInkeepCompletion(input.searchQuery);
    return response.content;
  } catch (error) {
    console.error("Error in AI tool:", error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
