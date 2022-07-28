import usePullStore from "./usePullStore";
import {useEffect, useState} from "react";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";
import {getLogin} from "../integration/getLogin";
import {saveUpdatedPullsToStore} from "../store/pulls";
import {PullRequestLastVisit, PullRequestShort} from "../types";
import {isActionUserInitiated} from "../tools/isActionUserInitiated";

const usePulls = () => {
  const {isPullStoreLoading, updatedPulls, recentlyVisitedPulls, hiddenPulls, visitPull} = usePullStore();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);

  const exitShortcut = () => console.debug("usePulls: exitShortcut");

  const runPullIteration = () => Promise.all([
    getLogin(),
    searchPullRequestsWithDependencies("is:open archived:false author:@me"),
    searchPullRequestsWithDependencies("is:open archived:false commenter:@me"),
    searchPullRequestsWithDependencies("is:open archived:false review-requested:@me")
  ])
    .then(
      ([login, authoredPulls, commentedOnPulls, reviewRequestedPulls]) => {
        const pulls = authoredPulls.concat(commentedOnPulls, reviewRequestedPulls)
          .filter((pull, index, self) => self.findIndex(p => p.number === pull.number) === index);

        console.debug(`pull iteration: pulled-prs=${pulls.length}`);

        return ({login, pulls});
      }
    )
    .then(({login, pulls}) => processPulls(login, hiddenPulls, pulls))
    .then(saveUpdatedPullsToStore);

  useEffect(() => {
    // Run effect only after we load from store.
    // We're most interested in the hiddenPulls
    // to correctly filter out fresh PRs.
    if (isPullStoreLoading) {
      return;
    }

    Promise.resolve()
      .then(() => console.debug("usePulls: start"))
      .then(() => isActionUserInitiated() ? exitShortcut() : runPullIteration())
      .finally(() => {
        setIsRemotePullsLoading(false);
        console.debug("usePulls: end");
      })
  }, [isPullStoreLoading]);

  return {
    isLoading: isPullStoreLoading || isRemotePullsLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull
  };
}

export default usePulls;

const processPulls = (login: string, hiddenPulls: PullRequestLastVisit[], pulls: PullRequestShort[]) =>
  pulls
    .map(processPull(login, hiddenPulls))
    .filter(pull => pull !== null) as PullRequestShort[];

const processPull = (login: string, hiddenPulls: PullRequestLastVisit[]) =>
  (pull: PullRequestShort) => {
    const logPrefix = createLogPrefix(pull);

    console.debug(`${logPrefix} url=${pull.url}`);

    if (isMyFreshPR(logPrefix, login, pull)) {
      console.debug(`${logPrefix} action=drop`)

      return null;
    }

    if (isSomeonesFreshPR(logPrefix, login, pull)) {
      console.debug(`${logPrefix} action=keep`)

      return pull;
    }

    if (pull.requestedReviewers.length > 0) {
      console.debug(`${logPrefix} requested-reviewers=${pull.requestedReviewers.length} action=keep`)

      return pull;
    }

    const lastVisitedAt = hiddenPulls.find(pr => pr.id === pull.id)?.lastVisitedAt || "0000-00-00T00:00:00Z";
    const comment = getEligibleComment(login, lastVisitedAt, pull);
    const review = getEligibleReview(login, lastVisitedAt, pull);

    if (!comment && !review) {
      console.debug(`${logPrefix} comment=none review=none action=drop`)

      return null;
    }

    return pull;
  };

const createLogPrefix = (pull: PullRequestShort) =>
  `processPull: prid=${prid(pull)}`;

const isMyFreshPR = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const noComments = !isCommented(pull);
  const noReviews = !isReviewed(pull);

  const prIsFresh = authored && noComments && noReviews;

  if (prIsFresh) {
    console.debug(`${logPrefix} author=@me comments=none reviews=none`)
  }

  return prIsFresh;
}

const isSomeonesFreshPR = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const commented = isCommented(pull);
  const reviewed = isReviewed(pull);

  const prIsFresh = !authored && !commented && !reviewed

  if (prIsFresh) {
    console.debug(`${logPrefix} author=${pull.user.login} comments=none reviews=none`)
  }

  return prIsFresh;
}


const isAuthor = (login: string, pull: PullRequestShort) => pull.user.login === login;
const isCommented = (pull: PullRequestShort) => pull.comments.length > 0;
const isReviewed = (pull: PullRequestShort) => pull.reviews.length > 0;

const getEligibleComment = (login: string, lastVisit: string, pull: PullRequestShort) => {
  const comment = pull.comments[pull.comments.length - 1];

  return comment && comment.user.login !== login && comment.createdAt > lastVisit
    ? comment
    : null;
};

const getEligibleReview = (login: string, lastVisit: string, pull: PullRequestShort) => {
  const review = pull.reviews[pull.reviews.length - 1];

  return review && review.user.login !== login && review.submittedAt > lastVisit
    ? review
    : null;
};

const prid = ({url, number}: PullRequestShort) =>
  `${url.split("/")[3]}/${url.split("/")[4]}#${number}`;
