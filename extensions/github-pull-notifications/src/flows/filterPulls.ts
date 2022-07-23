import {
  CommentShort,
  PullRequestLastVisit,
  PullRequestReviewShort,
  PullSearchResultShort
} from "../integration/types";
import { getIssueComments, getPullComments } from "../integration/getComments";
import { mapPullSearchResultToPRID } from "../tools/mapPullSearchResultToPRID";
import getReviews from "../integration/getReviews";
import { getTimestampISOInSeconds } from "../tools/getTimestampISOInSeconds";

export const filterPulls = (login: string, recentVisits: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.resolve()
    .then(() => console.debug(`filterPulls: login=${login}, recentVisits=${recentVisits.length}, pulls=${pulls.length}`))
    .then(() => testPulls(login, recentVisits, pulls))
    .then(weedOutNonPulls)
    .finally(() => console.debug(`filterPulls: done`));

const testPulls = (login: string, recentVisits: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.all(pulls.map(pull => testPull(login, recentVisits, pull)));

const testPull = (login: string, recentVisits: PullRequestLastVisit[], pull: PullSearchResultShort) =>
  fetchAllItems(pull).then(([comment, review]) => keepApplicablePull({ pull, login, recentVisits, comment, review }));

const fetchAllItems = (pull: PullSearchResultShort) => Promise.resolve()
  .then(() => mapPullSearchResultToPRID(pull))
  .then(pullID => Promise.all([
    getPullComments(pullID),
    getIssueComments(pullID),
    getReviews(pullID)
  ]))
  .then(([pullComments, issueComments, reviews]) => [
    pullComments.concat(issueComments),
    reviews
  ] as [CommentShort[], PullRequestReviewShort[]])
  .then(([comments, reviews]) => [
    comments.sort((a, b) => a.created_at < b.created_at ? -1 : 1).pop(),
    reviews.sort(compareShortReviews).pop()
  ] as [CommentShort | undefined, PullRequestReviewShort | undefined]);

type KeepApplicablePullParams = {
  pull: PullSearchResultShort;
  login: string;
  recentVisits: PullRequestLastVisit[];
  comment: CommentShort | undefined;
  review: PullRequestReviewShort | undefined;
}

const keepApplicablePull = ({ pull, login, recentVisits, comment, review }: KeepApplicablePullParams) => {
  const { owner, repo, pull_number } = mapPullSearchResultToPRID(pull);
  const logPrefix = `keepApplicablePull: pull=${owner}/${repo}#${pull_number}`;

  const iAmAuthor = pull.user?.login === login;

  if (!comment && !review && !iAmAuthor) {
    console.debug(`${logPrefix} action=keep`);

    return pull;
  }

  const commentTimestamp = getCommentTimestamp({ comment, login, recentVisits, logPrefix, pull });
  const reviewTimestamp = getReviewTimestamp({ review, login, recentVisits, logPrefix, pull });

  if (!commentTimestamp && !reviewTimestamp) {
    console.debug(`${logPrefix} action=drop`);

    return false;
  }

  if (commentTimestamp && !reviewTimestamp) {
    pull.html_url = comment?.html_url || "";
  } else if (!commentTimestamp && reviewTimestamp) {
    pull.html_url = review?.html_url || "";
  } else {
    if (commentTimestamp > reviewTimestamp) {
      pull.html_url = comment?.html_url || "";
    } else {
      pull.html_url = review?.html_url || "";
    }
  }

  console.debug(`${logPrefix} action=keep`);

  return pull;
};

type GetCommentTimestampParams = { comment: CommentShort | undefined; } & FilterParams;
type GetReviewTimestampParams = { review: PullRequestReviewShort | undefined; } & FilterParams;

type FilterParams = {
  logPrefix: string;
  login: string;
  recentVisits: PullRequestLastVisit[];
  pull: PullSearchResultShort;
};

function getCommentTimestamp({ logPrefix, comment, login, recentVisits, pull }: GetCommentTimestampParams) {
  if (!comment) {
    console.debug(`${logPrefix} comment=none`);

    return false;
  }

  if (comment.user?.login === login) {
    console.debug(`${logPrefix} comment=own`);

    return false;
  }

  const lastVisit = recentVisits.find(visit => visit.pull.id === pull.id);

  if (lastVisit && lastVisit.last_visit > comment.created_at) {
    console.debug(`${logPrefix} comment.created_at=${comment.created_at} last_visit=${lastVisit.last_visit}`);

    return false;
  }

  console.debug(`${logPrefix} comment=fresh user=${comment.user?.login}`);

  return comment.created_at;
}

function getReviewTimestamp({ pull, review, login, recentVisits, logPrefix }: GetReviewTimestampParams) {
  if (!review) {
    console.debug(`${logPrefix} review=none`);

    return false;
  }

  // pending, not yet submitted review?
  // if so, it should always be kept
  if (review.submitted_at === null) {
    console.debug(`${logPrefix} review.submitted_at=null`);

    return getTimestampISOInSeconds();
  }

  if (review.user?.login === login) {
    console.debug(`${logPrefix} review=own`);

    return false;
  }

  const lastVisit = recentVisits.find(visit => visit.pull.id === pull.id);

  if (lastVisit && lastVisit.last_visit > (review.submitted_at as string)) {
    console.debug(`${logPrefix} review.submitted_at=${review.submitted_at} last_visit=${lastVisit.last_visit}`);

    return false;
  }

  console.debug(`${logPrefix} review=fresh user=${review.user?.login}`);

  return review.submitted_at || getTimestampISOInSeconds();
}

const weedOutNonPulls = (pulls: (PullSearchResultShort | false)[]) =>
  (pulls.filter(pull => pull) || []) as PullSearchResultShort[];

const compareShortReviews = (a: PullRequestReviewShort, b: PullRequestReviewShort) => {
  if (!a.submitted_at && !b.submitted_at) {
    return 0;
  } else if (!a.submitted_at && b.submitted_at) {
    return 1;
  } else if (a.submitted_at && !b.submitted_at) {
    return -1;
  } else {
    return (a.submitted_at as string) < (b.submitted_at as string) ? -1 : 1;
  }
};
