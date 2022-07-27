import octokit from "./octokit";
import { PullRequestID, TeamShort, UserShort } from "./types";
import { mapUserShort } from "./mappers";

const getRequestedReviewers = (prid: PullRequestID): Promise<{users: UserShort[], teams: TeamShort[]}> => Promise.resolve()
  .then(() => octokit.rest.pulls.listRequestedReviewers(prid))
  .then(res => res.data)
  .then(({users, teams}) => ({
    users: users.map(mapUserShort) as UserShort[],
    teams: teams.map(({id, name, html_url}) => ({id, name, html_url}) as TeamShort) as TeamShort[],
  }));

export default getRequestedReviewers;
