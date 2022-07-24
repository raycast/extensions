import {
  CommentShort,
  PullRequestLastVisit,
  PullRequestReviewShort,
  PullSearchResultShort, UndefinedString
} from "../integration/types";
import { getIssueComments, getPullComments } from "../integration/getComments";
import { mapPullSearchResultToPRID } from "../tools/mapPullSearchResultToPRID";
import getReviews from "../integration/getReviews";
import { getTimestampISOInSeconds } from "../tools/getTimestampISOInSeconds";

export const filterPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.resolve()
    .then(() => console.debug(`filterPulls: login=${login}, hiddenPulls=${hiddenPulls.length}, pulls=${pulls.length}`))
    .then(() => testPulls(login, hiddenPulls, pulls))
    .then(weedOutNonPulls)
    .finally(() => console.debug(`filterPulls: done`));

const testPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullSearchResultShort[]) =>
  Promise.all(pulls.map(pull => testPull(login, hiddenPulls, pull)));

const testPull = (login: string, hiddenPulls: PullRequestLastVisit[], pull: PullSearchResultShort) =>
  fetchAllItems(pull).then(([comment, review]) => keepApplicablePull({ pull, login, hiddenPulls, comment, review }));

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
  hiddenPulls: PullRequestLastVisit[];
  comment: CommentShort | undefined;
  review: PullRequestReviewShort | undefined;
}

const keepApplicablePull = ({ pull, login, hiddenPulls, comment, review }: KeepApplicablePullParams) => {
  const { owner, repo, pull_number } = mapPullSearchResultToPRID(pull);
  const logPrefix = `keepApplicablePull: pull=${owner}/${repo}#${pull_number}`;

  const iAmAuthor = pull.user?.login === login;

  if (!comment && !review && !iAmAuthor) {
    console.debug(`${logPrefix} action=keep`);

    pull.myIcon = "🙏";

    return pull;
  }

  const commentTimestamp = getCommentTimestamp({ comment, login, hiddenPulls, logPrefix, pull });
  const reviewTimestamp = getReviewTimestamp({ review, login, hiddenPulls, logPrefix, pull });
  const hideTimestamp = hiddenPulls.find(hidden => hidden.pull.id === pull.id)?.last_visit;

  if (!commentTimestamp && !reviewTimestamp) {
    console.debug(`${logPrefix} action=drop`);

    return false;
  }

  shouldAppendReviewIcon(hideTimestamp, reviewTimestamp) && (pull.myIcon += reviewStatusEmoji(review?.state || ""));
  shouldAppendCommentIcon(hideTimestamp, commentTimestamp) && (pull.myIcon += "💬");

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

const shouldAppendReviewIcon = (hideTimestamp: UndefinedString, reviewTimestamp: string | false) => {
  if (!reviewTimestamp) {
    return false;
  }

  if (!hideTimestamp) {
    return true;
  }

  return hideTimestamp < reviewTimestamp;
}

const shouldAppendCommentIcon = (hideTimestamp: UndefinedString, commentTimestamp: string | false) => {
  if (!commentTimestamp) {
    return false;
  }

  if (!hideTimestamp) {
    return true;
  }

  return hideTimestamp < commentTimestamp;
}

type GetCommentTimestampParams = { comment: CommentShort | undefined; } & FilterParams;
type GetReviewTimestampParams = { review: PullRequestReviewShort | undefined; } & FilterParams;

type FilterParams = {
  logPrefix: string;
  login: string;
  hiddenPulls: PullRequestLastVisit[];
  pull: PullSearchResultShort;
};

function getCommentTimestamp({ logPrefix, comment, login, hiddenPulls, pull }: GetCommentTimestampParams) {
  if (!comment) {
    console.debug(`${logPrefix} comment=none`);

    return false;
  }

  if (comment.user?.login === login) {
    console.debug(`${logPrefix} comment=own`);

    return false;
  }

  const lastVisit = hiddenPulls.find(hidden => hidden.pull.id === pull.id);

  if (lastVisit && lastVisit.last_visit > comment.created_at) {
    console.debug(`${logPrefix} comment.created_at=${comment.created_at} last_visit=${lastVisit.last_visit}`);

    return false;
  }

  console.debug(`${logPrefix} comment=fresh user=${comment.user?.login}`);

  return comment.created_at;
}

function getReviewTimestamp({ pull, review, login, hiddenPulls, logPrefix }: GetReviewTimestampParams) {
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

  const lastVisit = hiddenPulls.find(hidden => hidden.pull.id === pull.id);

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

const reviewStatusEmoji = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "✅";
    case "CHANGES_REQUESTED":
      return "📝";
    case "COMMENTED":
      return "💬";
    case "DISMISSED":
      return "🚫";
    case "PENDING":
      return "⏳";
    default:
      return "🔍";
  }
}