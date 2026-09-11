import { getGitHubClient } from "../api/githubClient";
import { truncatePatch } from "../helpers/pull-request";
import { withGitHubClient } from "../helpers/withGithubClient";

const FILES_PER_PAGE = 100;
const MAX_PAGES = 3;

type Input = {
  /**
   * Repository containing the pull request. Format: `owner/repo`. Use `search-repositories` to get the full name of repository in format of `owner/repo`. Always use only `owner/repo` format for repo, never use just `repo`
   * */
  repository: string;

  /**
   * The number of the pull request as displayed on GitHub, for example `123` for `#123`. Use `search-pull-requests` to find it when the user doesn't provide a number.
   * */
  pullRequestNumber: number;
};

export default withGitHubClient(async ({ repository, pullRequestNumber }: Input) => {
  const { octokit } = getGitHubClient();

  const [owner, repo] = repository.split("/");

  const files = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, headers } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullRequestNumber,
      per_page: FILES_PER_PAGE,
      page,
    });

    files.push(
      ...data.map(({ filename, status, additions, deletions, patch }) => {
        const truncatedPatch = patch ? truncatePatch(patch) : undefined;

        return {
          filename,
          status,
          additions,
          deletions,
          patch: truncatedPatch?.patch,
          patchTruncated: (truncatedPatch?.remainingLines ?? 0) > 0,
        };
      }),
    );

    // A full page does not imply another one follows, so trust the pagination header instead of the
    // page size. Otherwise a pull request with exactly MAX_PAGES * FILES_PER_PAGE files reports as
    // truncated despite being complete.
    if (!headers.link?.includes('rel="next"')) {
      break;
    }

    truncated = page === MAX_PAGES;
  }

  return { files, truncated };
});
