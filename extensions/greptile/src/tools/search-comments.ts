import { searchComments } from "../api/greptile";

type Input = {
  /**
   * Search term for Greptile review comments, such as "security", "authentication", a file path, or an error pattern.
   */
  query: string;
  /**
   * Whether to include comments already marked addressed. Defaults to false.
   */
  includeAddressed?: boolean;
  /**
   * Maximum number of comments to return. Use 10 by default and never exceed 50.
   */
  limit?: number;
  /**
   * Number of comments to skip for pagination.
   */
  offset?: number;
};

/**
 * Search Greptile-generated review comments and feedback across the organization. This is readonly.
 */
export default async function tool(input: Input) {
  const response = await searchComments(input);

  return response.comments;
}
