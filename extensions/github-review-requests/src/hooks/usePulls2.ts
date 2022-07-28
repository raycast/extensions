import usePullStore2 from "./usePullStore2";
import {useEffect, useState} from "react";
import {environment, LaunchType} from "@raycast/api";
import searchPullRequestsWithDependencies from "../integration2/searchPullRequestsWithDependencies";
import {getLogin} from "../integration/getLogin";
import {saveAllPullsToStore, saveUpdatedPullsToStore} from "../store/pulls";
import {PullRequestLastVisit, PullRequestShort} from "../integration2/types";
import {getTimestampISOInSeconds} from "../tools/getTimestampISOInSeconds";

const usePulls2 = () => {
  const {isPullStoreLoading, updatedPulls, recentlyVisitedPulls, hiddenPulls} = usePullStore2();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);

  useEffect(() => {
    // Run effect only after we load from store.
    // We're most interested in the hiddenPulls
    // to correctly filter out fresh PRs.
    if (isPullStoreLoading) {
      return;
    }

    console.debug("use pulls hook started");

    if (environment.launchType !== LaunchType.Background) {
      setIsRemotePullsLoading(false);
      console.debug("use pulls hook finished");

      return;
    }

    Promise.all([
      getLogin(),
      searchPullRequestsWithDependencies("is:open archived:false author:@me"),
      searchPullRequestsWithDependencies("is:open archived:false commenter:@me"),
      searchPullRequestsWithDependencies("is:open archived:false review-requested:@me")
    ])
      .then(
        ([login, authoredPulls, commentedOnPulls, reviewRequestedPulls]) => {
          console.debug(
            `pulled pulls: authoredPulls=${authoredPulls.length} ` +
            `commentedOnPulls=${commentedOnPulls.length} ` +
            `reviewRequestedPulls=${reviewRequestedPulls.length}`
          );

          return ({
            login,
            pulls: authoredPulls.concat(commentedOnPulls, reviewRequestedPulls)
              .filter((pull, index, self) => self.findIndex(p => p.number === pull.number) === index)
          });
        }
      )
      .then(({login, pulls}) => filterPulls(login, hiddenPulls)(pulls))
      .then(saveUpdatedPullsToStore)
      .finally(() => {
        setIsRemotePullsLoading(false);
        console.debug("use pulls hook finished");
      });
  }, [isPullStoreLoading]);

  return {
    isLoading: isPullStoreLoading || isRemotePullsLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull: (pull: PullRequestShort) =>
      Promise.resolve(getTimestampISOInSeconds())
        .then(lastVisitedAt => {
          console.debug(lastVisitedAt);

          return saveAllPullsToStore({
            updatedPulls: updatedPulls.filter(pr => pr.id !== pull.id),

            recentlyVisitedPulls: [
              pull,
              ...recentlyVisitedPulls.filter(pr => pr.id !== pull.id).slice(0, 19),
            ] as PullRequestShort[],

            hiddenPulls: [
              {id: pull.id, lastVisitedAt},
              ...hiddenPulls.filter(pr => pr.id !== pull.id)
            ] as PullRequestLastVisit[]
          });
        })
  };
}

export default usePulls2;

const filterPulls = (login: string, hiddenPulls: PullRequestLastVisit[]) =>
  (pulls: PullRequestShort[]) =>
    pulls.map(filterPull(login, hiddenPulls))
      .filter(pull => pull !== null) as PullRequestShort[];

const filterPull = (login: string, hiddenPulls: PullRequestLastVisit[]) =>
  (pull: PullRequestShort) => {
    const pullId = prid(pull);
    const logPrefix = `filterPull: prid=${pullId}`;

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
    console.debug(`${logPrefix} last-visited-at=${lastVisitedAt}`);
    console.debug("hidden", JSON.stringify(hiddenPulls))

    const comment = eligibleComment(login, lastVisitedAt, pull);
    const review = eligibleReview(login, lastVisitedAt, pull);

    if (!comment && !review) {
      console.debug(`${logPrefix} comment=none review=none action=drop`)

      return null;
    }

    return pull;
  };

const isMyFreshPR = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const noComments = !isCommented(pull);
  const noReviews = !isReviewed(pull);

  console.debug(`${logPrefix} authored=${authored} no-comments=${noComments} no-reviews=${noReviews}`);

  return authored && noComments && noReviews;
}

const isSomeonesFreshPR = (logPrefix: string, login: string, pull: PullRequestShort) => {
  const authored = isAuthor(login, pull);
  const commented = isCommented(pull);
  const reviewed = isReviewed(pull);

  console.debug(`${logPrefix} authored=${authored} commented=${commented} reviewed=${reviewed}`);

  return !authored && !commented && !reviewed;
}


const isAuthor = (login: string, pull: PullRequestShort) => pull.user.login === login;
const isCommented = (pull: PullRequestShort) => pull.comments.length > 0;
const isReviewed = (pull: PullRequestShort) => pull.reviews.length > 0;

const eligibleComment = (login: string, lastVisit: string, pull: PullRequestShort) => {
  const comment = pull.comments[pull.comments.length - 1];

  return comment && comment.user.login !== login && comment.createdAt > lastVisit
    ? comment
    : null;
};

const eligibleReview = (login: string, lastVisit: string, pull: PullRequestShort) => {
  const review = pull.reviews[pull.reviews.length - 1];

  return review && review.user.login !== login && review.submittedAt > lastVisit
    ? review
    : null;
};

const prid = ({url, number}: PullRequestShort) =>
  `${url.split("/")[3]}/${url.split("/")[4]}#${number}`;
