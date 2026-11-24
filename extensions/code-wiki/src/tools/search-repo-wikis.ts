import { repoSearchURL } from "../lib/code-wiki-url";

type Input = {
  /** Repository name, owner, or keywords to search for on Code Wiki. */
  query: string;
};

/** Return a Code Wiki search link without opening the browser or listing results. */
export default function tool(input: Input) {
  return repoSearchURL(input.query);
}
