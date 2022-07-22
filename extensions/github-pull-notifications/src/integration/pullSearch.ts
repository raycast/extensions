import { PullSearchResultShort } from "./types";
import octokit from "./octokit";
import { mapPullSearchResultToShort } from "./mappers";

export const pullSearch = (query: string): Promise<PullSearchResultShort[]> => Promise.resolve()
  .then(() => console.debug(`pullSearch for ${query}`))
  .then(() => octokit.rest.search.issuesAndPullRequests({ per_page: 100, q: `is:pr ${query}` }))
  .then(res => res.data.items || [])
  .then(items => items.map(mapPullSearchResultToShort))
  .finally(() => console.debug(`pullSearch for ${query} done`));