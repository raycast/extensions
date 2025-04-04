import { getDrafts } from "../utils/get-drafts";

type Input = {
  /**
   * The search term to search for in the drafts.
   */
  searchTerm: string;
  /**
   * Filter by title only of full content.
   *
   * - true - filter by title only
   * - false - filter by full content
   */
  titleOnly: boolean;
};

export default async function (input: Input) {
  const drafts = await getDrafts(input.searchTerm, input.titleOnly);
  return drafts;
}
