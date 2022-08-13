import { PullRequestLastVisit, PullRequestShort, ReviewShort } from "../types";

export const processPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullRequestShort[]) =>
  pulls.map(pull => pickAction(login, hiddenPulls, pull)(pull)).filter(pull => pull !== null) as PullRequestShort[];

const pickAction = (
  login: string,
  lastVisits: PullRequestLastVisit[],
  pull: PullRequestShort
): ((pull: PullRequestShort) => PullRequestShort | null) => {
  const lastVisitedAt = getLastVisitedAt(lastVisits, pull);

  switch (true) {
    case isAlreadyVisited(pull, lastVisitedAt):
      return dropAlreadyVisitedPR;

    case isMyPRNew(login, pull):
      return dropMyPR;

    case isSomeoneElsePRNNew(login, pull):
      return keepSomeoneElsePR;

    case isReviewerRequested(login, pull):
      return keepPRWithRequestedReviewers;

    case hasRecentComment(login, pull, lastVisitedAt) || hasRecentReview(login, pull, lastVisitedAt):
      return keepPRWithFeedback(login, lastVisitedAt);

    default:
      return dropPRInUnknownState;
  }
};

const isAlreadyVisited = (pull: PullRequestShort, lastVisitedAt: string) => pull.updatedAt < lastVisitedAt;

const isMyPRNew = (login: string, pull: PullRequestShort) =>
  pull.user.login === login && pull.comments.length === 0 && pull.reviews.length === 0;

const isSomeoneElsePRNNew = (login: string, pull: PullRequestShort) =>
  pull.user.login !== login && pull.comments.length === 0 && pull.reviews.length === 0;

const isReviewerRequested = (login: string, pull: PullRequestShort) =>
  pull.user.login !== login && pull.requestedReviewers.length > 0;

const hasRecentComment = (login: string, pull: PullRequestShort, lastVisitedAt: string) =>
  pull.comments.some(comment => comment.user.login !== login && comment.createdAt > lastVisitedAt);

const hasRecentReview = (login: string, pull: PullRequestShort, lastVisit: string) =>
  pull.reviews.some(review => review.user.login !== login && review.submittedAt > lastVisit);

const dropAlreadyVisitedPR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=visited`);

  return null;
};

const dropMyPR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=my-pr-is-new`);

  return null;
};

const keepSomeoneElsePR = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=someone-else-pr-is-new`);

  pull.myIcon = "👥";

  return pull;
};

const keepPRWithFeedback = (login: string, lastVisitedAt: string) => (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=has-feedback`);

  if (hasRecentReview(login, pull, lastVisitedAt)) {
    pull.myIcon = selectIconForState(pull.reviews);
  }

  if (hasRecentComment(login, pull, lastVisitedAt) && pull.myIcon !== "💬") {
    pull.myIcon += "💬";
  }

  pull.url = selectLatestURL(pull);

  return pull;
};

const selectLatestURL = (pull: PullRequestShort) => {
  const { url, comments, reviews } = pull;
  const comment = comments[comments.length - 1];
  const review = reviews[reviews.length - 1];

  switch (true) {
    case !!comment && !!review:
      return comment.createdAt > review.submittedAt ? comment.url : review.url;
    case !!comment:
      return comment.url;
    case !!review:
      return review.url;
    default:
      return url;
  }
};

const selectIconForState = (reviews: ReviewShort[]) => {
  switch (reviews[0]?.state) {
    case "APPROVED":
      return "👍";
    case "CHANGES_REQUESTED":
      return "🔄";
    case "COMMENTED":
      return "💬";
    case "DISMISSED":
      return "☁️";
    case "PENDING":
      return "🕑";
    default:
      return "💬";
  }
};

const keepPRWithRequestedReviewers = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=keep reason=has-requested-reviewers`);

  pull.myIcon = "👥";

  return pull;
};

const dropPRInUnknownState = (pull: PullRequestShort) => {
  console.debug(`${createLogPrefix(pull)} action=drop reason=unknown-state`);

  return null;
};

const createLogPrefix = (pull: PullRequestShort) => `processPull: prid=${prid(pull)}`;

const prid = ({ url, number }: PullRequestShort) => `${url.split("/")[3]}/${url.split("/")[4]}#${number}`;

const getLastVisitedAt = (hiddenPulls: PullRequestLastVisit[], pull: PullRequestShort) =>
  hiddenPulls.find(pr => pr.id === pull.id)?.lastVisitedAt || "0000-00-00T00:00:00Z";
