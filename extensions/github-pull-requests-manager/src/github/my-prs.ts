import { getApiUrl, getAuthenticatedUser } from "./auth";
import { searchPullRequests } from "./search";
import { fetchReviewCounts } from "./extra-info";
import { CategorizedPRs, PullRequest } from "./types/pr";
import { getRepoName } from "./utils";

export async function fetchMyPRsCategorized(
  baseUrl: string,
  token: string,
  filterLabel?: string,
): Promise<CategorizedPRs> {
  const filterLabels = filterLabel
    ? filterLabel
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const apiUrl = getApiUrl(baseUrl);
  const login = await getAuthenticatedUser(baseUrl, token);
  const [authoredPRs, assignedPRs] = await Promise.all([
    searchPullRequests(apiUrl, token, `is:pr is:open author:${login}`),
    searchPullRequests(apiUrl, token, `is:pr is:open assignee:${login} -author:${login}`),
  ]);
  const prs = [...authoredPRs, ...assignedPRs]
    .filter((pr, index, self) => self.findIndex((p) => p.id === pr.id) === index)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const results = await Promise.all(
    prs.map(async (pr: PullRequest) => {
      const counts = await fetchReviewCounts(apiUrl, token, getRepoName(pr), pr.number);
      return { pr, counts };
    }),
  );

  const waitForMerge: PullRequest[] = [];
  const waitForChange: PullRequest[] = [];
  const waitForReview: PullRequest[] = [];
  const parked: PullRequest[] = [];

  for (const { pr, counts } of results) {
    if (counts.changesRequested > 0) {
      waitForChange.push(pr);
    } else if (counts.approved > 0) {
      waitForMerge.push(pr);
    } else if (pr.draft || (filterLabels.length > 0 && !pr.labels.some((l) => filterLabels.includes(l.name)))) {
      parked.push(pr);
    } else {
      waitForReview.push(pr);
    }
  }

  return { waitForMerge, waitForChange, waitForReview, parked };
}
