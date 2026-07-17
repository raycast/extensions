import { getGitHubClient } from "../api/githubClient";
import { getBoundedPreferenceNumber } from "../components/Menu";
import { withGitHubClient } from "../helpers/withGithubClient";

type Input = {
  /**
   * The query to search for
   * Repository search looks through the projects you have access to on GitHub. You can also filter the results:
   *  cat stars:>100	Find cat repositories with greater than 100 stars.
   *  user:defunkt	Get all repositories from the user defunkt.
   *  pugs pushed:>2013-01-28	Pugs repositories pushed to since Jan 28, 2013.
   *  node.js forks:<200	Find all node.js repositories with less than 200 forks.
   *  jquery size:1024..4089	Find jquery repositories between the sizes 1024 and 4089 kB.
   *  gitx fork:true	Repository search includes forks of gitx.
   *  gitx fork:only	Repository search returns only forks of gitx.
   * */
  query: string;
};

export default withGitHubClient(async ({ query }: Input) => {
  const { github } = getGitHubClient();

  const result = await github.searchRepositories({
    query,
    numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
  });

  return result.search.nodes;
});
