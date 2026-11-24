import { open } from "@raycast/api";
import { repoURL } from "../lib/code-wiki-url";

type Input = {
  /** A GitHub repository URL or github.com/owner/repo path. */
  repository: string;
};

/** Open a repository's generated documentation on Code Wiki. */
export default async function tool(input: Input) {
  const url = repoURL(input.repository);
  await open(url);
  return `Opened ${url}`;
}
