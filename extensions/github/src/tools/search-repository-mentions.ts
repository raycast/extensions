import { getGitHubClient } from "../api/githubClient";
import {
  MENTION_SEARCH_SIZE,
  type RepositoryMention,
  buildRepositorySearchQuery,
  mentionNodes,
  toMentions,
  toRepositoryMention,
} from "../helpers/mentions";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /** What the user typed in the Repositories mention search, empty for the default list. */
  query: string;
};

export default withGitHubClient(async ({ query }: Input) => {
  const { github } = getGitHubClient();
  const text = query.trim();

  if (!text) {
    // Your own and your organizations' repositories, most recently pushed first.
    const result = await github.viewerRepositoryMentions({ numberOfItems: MENTION_SEARCH_SIZE });
    return toMentions(result.viewer.repositories.nodes?.flatMap((node) => node ?? []) ?? [], toRepositoryMention);
  }

  const result = await github.searchRepositoryMentions({
    query: buildRepositorySearchQuery(text),
    numberOfItems: MENTION_SEARCH_SIZE,
  });
  return toMentions(mentionNodes<RepositoryMention>(result.search.nodes, "nameWithOwner"), toRepositoryMention);
});
