import { PullRequestID, PullSearchResultShort } from "../integration/types";

export const mapPullSearchResultToPRID = ({ number, repository_url }: PullSearchResultShort): PullRequestID => ({
  owner: repository_url.split("/")[4],
  repo: repository_url.split("/")[5],
  pull_number: number,
})