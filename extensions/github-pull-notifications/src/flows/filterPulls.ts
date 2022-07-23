import { CommentShort, PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { getIssueComments, getPullComments, pullToCommentsParams } from "../integration/getComments";

export const filterPulls = (login: string, recentVisits: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.all(
    pulls.map(
      pull =>
        fetchAllComments(pull)
          .then(comment => keepApplicablePull(pull, login, recentVisits, comment))
    )
  )
    .then(weedOutNonPulls);

const fetchAllComments = (pull: PullSearchResultShort) =>
  Promise.all([
    getPullComments(pullToCommentsParams(pull)),
    getIssueComments(pullToCommentsParams(pull))
  ])
    .then(([pullComments, issueComments]) => pullComments.concat(issueComments))
    .then(comments => comments.sort((a, b) => a.created_at < b.created_at ? -1 : 1))
    .then(comments => comments.pop());

const keepApplicablePull = (pull: PullSearchResultShort, login: string, recentVisits: PullRequestLastVisit[], comment: CommentShort | undefined) => {
  if (!comment || comment.user?.login === login) {
    return false;
  }

  const lastVisit = recentVisits.find(visit => visit.pull.id === pull.id);

  if (lastVisit && lastVisit.last_visit > comment.created_at) {
    return false;
  }

  pull.html_url = comment.html_url;

  return pull;
};

const weedOutNonPulls = (pulls: (PullSearchResultShort | false)[]) =>
  (pulls.filter(pull => pull) || []) as PullSearchResultShort[];