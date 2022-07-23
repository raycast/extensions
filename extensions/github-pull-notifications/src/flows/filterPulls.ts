import { CommentShort, PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { getIssueComments, getPullComments } from "../integration/getComments";
import { mapPullSearchResultToPRID } from "../tools/mapPullSearchResultToPRID";

export const filterPulls = (login: string, recentVisits: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.resolve()
    .then(() => console.debug(`filterPulls: login=${login}, recentVisits=${recentVisits.length}, pulls=${pulls.length}`))
    .then(() => testPulls(login, recentVisits, pulls))
    .then(weedOutNonPulls)
    .finally(() => console.debug(`filterPulls: done`));

const testPulls = (login: string, recentVisits: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.all(pulls.map(pull => testPull(login, recentVisits, pull)));

const testPull = (login: string, recentVisits: PullRequestLastVisit[], pull: PullSearchResultShort) =>
  fetchAllComments(pull).then(comment => keepApplicablePull(pull, login, recentVisits, comment));

const fetchAllComments = (pull: PullSearchResultShort) =>
  Promise.all([
    getPullComments(mapPullSearchResultToPRID(pull)),
    getIssueComments(mapPullSearchResultToPRID(pull))
  ])
    .then(([pullComments, issueComments]) => pullComments.concat(issueComments))
    .then(comments => comments.sort((a, b) => a.created_at < b.created_at ? -1 : 1))
    .then(comments => comments.pop());

const keepApplicablePull = (pull: PullSearchResultShort, login: string, recentVisits: PullRequestLastVisit[], comment: CommentShort | undefined) => {
  const {owner, repo, pull_number} = mapPullSearchResultToPRID(pull);
  const logPrefix = `keepApplicablePull: pull=${owner}/${repo}#${pull_number}`;

  if (!comment) {
    console.debug(`${logPrefix} action=drop comment=none`);

    return false;
  }

  if (comment.user?.login === login) {
    console.debug(`${logPrefix} action=drop comment=own`);

    return false;
  }

  const lastVisit = recentVisits.find(visit => visit.pull.id === pull.id);

  if (lastVisit && lastVisit.last_visit > comment.created_at) {
    console.debug(`${logPrefix} action=drop comment.created_at=${comment.created_at} last_visit=${lastVisit.last_visit}`);

    return false;
  }

  pull.html_url = comment.html_url;
  console.debug(`${logPrefix} action=keep comment=${comment.user?.login}`);

  return pull;
};

const weedOutNonPulls = (pulls: (PullSearchResultShort | false)[]) =>
  (pulls.filter(pull => pull) || []) as PullSearchResultShort[];