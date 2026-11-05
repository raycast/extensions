import { getGitHubClient } from "../api/githubClient";
import {
  MENTION_SEARCH_SIZE,
  type PullRequestMention,
  buildItemSearchQuery,
  mentionNodes,
  parseItemReference,
  toMentions,
  toPullRequestMention,
} from "../helpers/mentions";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /** What the user typed in the Pull Requests mention search, empty for the default list. */
  query: string;
};

export default withGitHubClient(async ({ query }: Input) => {
  const { github } = getGitHubClient();

  const reference = parseItemReference(query);
  if (reference) {
    const exact = await github
      .issueOrPullRequestMention({ owner: reference.owner, name: reference.name, number: reference.number })
      .catch(() => undefined);
    const item = exact?.repository?.issueOrPullRequest;
    if (item?.__typename === "PullRequest") return [toPullRequestMention(item)];
  }

  const result = await github.searchPullRequestMentions({
    query: buildItemSearchQuery("pr", query),
    numberOfItems: MENTION_SEARCH_SIZE,
  });
  return toMentions(mentionNodes<PullRequestMention>(result.search.nodes, "number"), toPullRequestMention);
});
