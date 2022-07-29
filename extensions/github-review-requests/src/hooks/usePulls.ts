import usePullStore from "./usePullStore";
import {useEffect, useState} from "react";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";
import {getLogin} from "../integration/getLogin";
import {isActionUserInitiated} from "../util";
import {processPulls} from "../flows/processPulls";

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
      .then(([login, authoredPulls, commentedOnPulls, reviewRequestedPulls]) => {
        const pulls = authoredPulls
          .concat(commentedOnPulls, reviewRequestedPulls)
          .filter((pull, index, self) => self.findIndex((p) => p.id === pull.id) === index);

        console.debug(`pull iteration: pulled-prs=${pulls.length}`);

        return { login, pulls };
      })
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

