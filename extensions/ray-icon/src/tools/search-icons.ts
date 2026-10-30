import { iconTitle, searchIcons } from "../lib/icons";

type Input = {
  /**
   * Keywords describing the glyph, e.g. "weather cloud" or "code terminal". Several words widen the search.
   */
  query: string;
  /**
   * Maximum number of results (default 20).
   */
  limit?: number;
};

/** Returns icon names to pass as `icon` to Create Icon. Empty means nothing matched: try synonyms. */
export default function tool(input: Input) {
  return searchIcons(input.query, input.limit ?? 20).map((name) => ({ name, title: iconTitle(name) }));
}
