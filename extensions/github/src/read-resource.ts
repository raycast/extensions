import { getGitHubClient } from "./api/githubClient";
import { parseMentionUri, serializeIssue, serializePullRequest, serializeRepository } from "./helpers/mentions";
import { withGitHubClient } from "./helpers/withGithubClient";

type Input = {
  /** The URI of an issue, pull request, or repository selected from GitHub's mention searches. */
  uri: string;
};

export default withGitHubClient(async ({ uri }: Input) => {
  const resource = parseMentionUri(uri);
  const { octokit } = getGitHubClient();
  const repository = `${resource.owner}/${resource.name}`;

  switch (resource.kind) {
    case "issue": {
      const { data } = await octokit.issues.get({
        owner: resource.owner,
        repo: resource.name,
        issue_number: resource.number,
      });
      return serializeIssue(repository, data);
    }
    case "pullRequest": {
      const { data } = await octokit.pulls.get({
        owner: resource.owner,
        repo: resource.name,
        pull_number: resource.number,
      });
      return serializePullRequest(repository, data);
    }
    case "repository": {
      const { data } = await octokit.repos.get({ owner: resource.owner, repo: resource.name });
      return serializeRepository(data);
    }
  }
});
