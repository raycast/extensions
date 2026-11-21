import { getGitHubClient } from "../api/githubClient";
import {
  type IssueMention,
  MENTION_SEARCH_SIZE,
  buildItemSearchQuery,
  mentionNodes,
  parseItemReference,
  toIssueMention,
  toMentions,
} from "../helpers/mentions";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /** What the user typed in the Issues mention search, empty for the default list. */
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
    if (item?.__typename === "Issue") return [toIssueMention(item)];
  }

  const result = await github.searchIssueMentions({
    query: buildItemSearchQuery("issue", query),
    numberOfItems: MENTION_SEARCH_SIZE,
  });
  return toMentions(mentionNodes<IssueMention>(result.search.nodes, "number"), toIssueMention);
});
