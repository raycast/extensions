import { searchActions } from "../ai-tools";

type Input = {
  /** Action name, description, category, slug, or numeric ID to search for. */
  query: string;
  /** Maximum results to return, from 1 through 25. Defaults to 10. */
  limit?: number;
};

/**
 * Search BetterTouchTool's built-in action catalog. Use this before run-action; never invent an action ID or parameter.
 */
export default function tool(input: Input) {
  return searchActions(input);
}
