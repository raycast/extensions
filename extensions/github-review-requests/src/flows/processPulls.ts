import {CommentShort, PullRequestLastVisit, PullRequestShort, ReviewShort} from "../types";

export const processPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullRequestShort[]) =>
  pulls.map(processPull(login, hiddenPulls)).filter((pull) => pull !== null) as PullRequestShort[];
const processPull = (login: string, hiddenPulls: PullRequestLastVisit[]) => (pull: PullRequestShort) => {
  const logPrefix = createLogPrefix(pull);

  console.debug(`${logPrefix} url=${pull.url}`);

  if (isMyPRNew(logPrefix, login, pull)) {
    console.debug(`${logPrefix} action=drop`);

    return null;
  }

  const lastVisitedAt = hiddenPulls.find((pr) => pr.id === pull.id)?.lastVisitedAt || "0000-00-00T00:00:00Z";

  if (isSomeonesPRNew(logPrefix, login, pull)) {
    if (pull.createdAt < lastVisitedAt) {
      console.debug(`${logPrefix} lastVisitedAt=${lastVisitedAt} action=drop`);

      return null;
    }

    console.debug(`${logPrefix} action=keep`);

    return pull;
  }

  console.debug(`${logPrefix} requested-reviewers=${pull.requestedReviewers.length}`);
  if (pull.requestedReviewers.length > 0) {
    console.debug(`${logPrefix} requested-reviewers=${pull.requestedReviewers.length} action=keep`);

    return pull;
  }

  const comment = getEligibleComment(logPrefix, login, lastVisitedAt, pull);
  const review = getEligibleReview(login, lastVisitedAt, pull);

  if (!comment && !review) {
    console.debug(`${logPrefix} comment=none review=none action=drop`);

    return null;
  }

  pull.url = selectLatestURLFrom(comment, review) || pull.url;
  console.debug(
    `${logPrefix} comment.createdAt=${comment?.createdAt} review.submittedAt=${review?.submittedAt} action=keep`
  );

  return pull;
};
const createLogPrefix = (pull: PullRequestShort) => `processPull: prid=${prid(pull)}`;
const isMyPRNew = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const noComments = !isCommented(pull);
  const noReviews = !isReviewed(pull);

  const prIsFresh = authored && noComments && noReviews;

  if (prIsFresh) {
    console.debug(`${logPrefix} author=@me comments=none reviews=none`);
  }

  return prIsFresh;
};
const isSomeonesPRNew = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const commented = isCommented(pull);
  const reviewed = isReviewed(pull);

  const prIsFresh = !authored && !commented && !reviewed;

  if (prIsFresh) {
    console.debug(`${logPrefix} author=${pull.user.login} comments=none reviews=none`);
  }

  return prIsFresh;
};
const isAuthor = (login: string, pull: PullRequestShort) => pull.user.login === login;
const isCommented = (pull: PullRequestShort) => pull.comments.length > 0;
const isReviewed = (pull: PullRequestShort) => pull.reviews.length > 0;
const getEligibleComment = (logPrefix: string, login: string, lastVisit: string, pull: PullRequestShort) => {
  const comment = pull.comments[pull.comments.length - 1];

  if (!comment) {
    console.debug(`${logPrefix} comment=none`);

    return null;
  }

  if (comment.user.login === login) {
    console.debug(`${logPrefix} comment.user=@me`);

    return null;
  }

  if (comment.createdAt < lastVisit) {
    console.debug(`${logPrefix} comment.createdAt=${comment.createdAt} lastVisit=${lastVisit}`);

    return null;
  }

  console.debug(
    `${logPrefix} comment.user=${comment.user.login} comment.createdAt=${comment.createdAt} lastVisit=${lastVisit}`
  );

  return comment;
};
const getEligibleReview = (login: string, lastVisit: string, pull: PullRequestShort) => {
  const review = pull.reviews[pull.reviews.length - 1];

  return review && review.user.login !== login && review.submittedAt > lastVisit ? review : null;
};
const selectLatestURLFrom = (comment: CommentShort | null, review: ReviewShort | null) => {
  if (!comment && !review) {
    return null;
  }

  if (!comment) {
    return review?.url;
  }

  if (!review) {
    return comment?.url;
  }

  return comment.createdAt > review.submittedAt ? comment.url : review.url;
};
const prid = ({url, number}: PullRequestShort) => `${url.split("/")[3]}/${url.split("/")[4]}#${number}`;