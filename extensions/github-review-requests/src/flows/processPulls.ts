import {PullRequestLastVisit, PullRequestShort} from "../types";

export const processPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullRequestShort[]) =>
  pulls
    .map(pull => pickAction(login, hiddenPulls, pull)(pull))
    .filter((pull) => pull !== null) as PullRequestShort[];

const pickAction = (login: string, lastVisits: PullRequestLastVisit[], pull: PullRequestShort): (pull: PullRequestShort) => PullRequestShort | null => {
  console.debug(createLogPrefix(pull));

  const lastVisitedAt = getLastVisitedAt(lastVisits, pull);

  switch (true) {
    case isAlreadyVisited(pull, lastVisitedAt):
      return dropAlreadyVisitedPR;

    case isMyPRNew2(login, pull):
      return dropMyPR;

    case isSomeoneElsePRNNew(login, pull):
      return keepSomeoneElsePR;

    case isReviewerRequested(pull):
      return keepPRWithRequestedReviewers;

    case hasRecentComment(login, pull, lastVisitedAt) || hasRecentReview(login, pull, lastVisitedAt):
      return keepPRWithFeedback;

    default:
      return dropPRInUnknownState;
  }
}

const isAlreadyVisited = (pull: PullRequestShort, lastVisitedAt: string) =>
  pull.updatedAt < lastVisitedAt;

const isMyPRNew2 = (login: string, pull: PullRequestShort) =>
  pull.user.login === login &&
  pull.comments.length === 0 &&
  pull.reviews.length === 0;

const isSomeoneElsePRNNew = (login: string, pull: PullRequestShort) =>
  pull.user.login !== login && pull.comments.length === 0 && pull.reviews.length === 0;

const isReviewerRequested = (pull: PullRequestShort) =>
  pull.requestedReviewers.length > 0;

const hasRecentComment = (login: string, pull: PullRequestShort, lastVisitedAt: string) =>
  pull.comments.some((comment) => comment.user.login !== login && comment.createdAt > lastVisitedAt);

const hasRecentReview = (login: string, pull: PullRequestShort, lastVisit: string) =>
  pull.reviews.some((review) => review.user.login !== login && review.submittedAt > lastVisit);

const dropAlreadyVisitedPR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=visited`);

  return null;
}

const dropMyPR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=my-pr-is-new`);

  return null;
}

const keepSomeoneElsePR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=someone-else-pr-is-new`);

  return pull;
}

const keepPRWithFeedback = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=has-feedback`);

  return pull;
}

const keepPRWithRequestedReviewers = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=has-requested-reviewers`);

  return pull;
}

const dropPRInUnknownState = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=unknown-state`);

  return null;
}

const createLogPrefix = (pull: PullRequestShort) => `processPull: prid=${prid(pull)}`;

const prid = ({url, number}: PullRequestShort) => `${url.split("/")[3]}/${url.split("/")[4]}#${number}`;

const getLastVisitedAt = (hiddenPulls: PullRequestLastVisit[], pull: PullRequestShort) =>
  hiddenPulls.find((pr) => pr.id === pull.id)?.lastVisitedAt || "0000-00-00T00:00:00Z";
