import usePullStore from "./usePullStore";
import {useEffect, useState} from "react";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";
import {getLogin} from "../integration/getLogin";
import {isActionUserInitiated} from "../util";
import {processPulls} from "../flows/processPulls";
import {PullRequestShort} from "../types";

const usePulls = () => {
  const { isPullStoreLoading, updatedPulls, recentlyVisitedPulls, hiddenPulls, visitPull, updatePulls } =
    usePullStore();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);

  const exitShortcut = () => console.debug("usePulls: exitShortcut");

  const runPullIteration = () =>
    Promise.all([
      getLogin(),
      searchPullRequestsWithDependencies("is:open archived:false author:@me"),
      searchPullRequestsWithDependencies("is:open archived:false commenter:@me"),
      searchPullRequestsWithDependencies("is:open archived:false review-requested:@me"),
    ])
      .then(mergePulls)
      .then(({ login, pulls }) => processPulls(login, hiddenPulls, pulls))
      .then(updatePulls);

  useEffect(() => {
    // Run effect only after we load from store.
    // We're most interested in the hiddenPulls
    // to correctly filter out fresh PRs.
    if (isPullStoreLoading) {
      return;
    }

    Promise.resolve()
      .then(() => console.debug("usePulls: start"))
      .then(() => (isActionUserInitiated() ? exitShortcut() : runPullIteration()))
      .finally(() => {
        setIsRemotePullsLoading(false);
        console.debug("usePulls: end");
      });
  }, [isPullStoreLoading]);

  return {
    isLoading: isPullStoreLoading || isRemotePullsLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull,
  };
};

export default usePulls;


const mergePulls = ([
  login, authoredPulls, commentedOnPulls, reviewRequestedPulls
]: [string, PullRequestShort[], PullRequestShort[], PullRequestShort[]]) => {
  const pulls = authoredPulls
    .concat(commentedOnPulls, reviewRequestedPulls)
    .filter(uniquePullRequests);

  console.debug(`pull iteration: pulled-prs=${pulls.length}`);

  return {login, pulls};
};


const uniquePullRequests = (pull: PullRequestShort, index: number, self: PullRequestShort[]) =>
  self.findIndex((p) => p.id === pull.id) === index;

