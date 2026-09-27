import { open } from "@raycast/api";
import { repoSearchURL } from "../lib/code-wiki-url";

type Input = {
  /** Repository name, owner, or keywords to search for on Code Wiki. */
  query: string;
};

/** Open Code Wiki search results for repositories. */
export default async function tool(input: Input) {
  const url = repoSearchURL(input.query);
  await open(url);
  return `Opened ${url}`;
}
