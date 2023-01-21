import usePullStore from "./usePullStore";
import { useEffect, useState } from "react";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";
import { getLogin } from "../integration/getLogin";
import { isActionUserInitiated } from "../util";
import { processPulls } from "../flows/processPulls";
import { PullRequestShort } from "../types";
import { Icon, MenuBarExtra } from "@raycast/api";

const usePulls = () => {
  const { isPullStoreLoading, updatedPulls, recentlyVisitedPulls, hiddenPulls, visitPull, updatePulls } =
    usePullStore();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);
  const [login, setLogin] = useState("");

  const exitShortcut = () => console.debug("usePulls: exitShortcut");

  const runPullIteration = () =>
    Promise.resolve()
      .then(() => console.debug("runPullIteration"))
      .then(() => setIsRemotePullsLoading(true))
      .then(() =>
        Promise.all([
          getLogin(),
          searchPullRequestsWithDependencies("is:open archived:false author:@me"),
          searchPullRequestsWithDependencies("is:open archived:false commenter:@me"),
          searchPullRequestsWithDependencies("is:open archived:false review-requested:@me"),
        ])
      )
      .then(mergePulls)
      .then(({ login, pulls }) => processPulls(login, hiddenPulls, pulls))
      .then(updatePulls)
      .finally(() => console.debug("runPullIteration: done"))
      .finally(() => setIsRemotePullsLoading(false));

  useEffect(() => {
    // Run effect only after we load from store.
    // We're most interested in the hiddenPulls
    // to correctly filter out fresh PRs.
    if (isPullStoreLoading) {
      return;
    }

    Promise.resolve()
      .then(() => console.debug("usePulls: start"))
      .then(() => getLogin().then(setLogin))
      .then(() => (isActionUserInitiated() ? exitShortcut() : runPullIteration()))
      .catch(console.error)
      .finally(() => console.debug("usePulls: end"));
  }, [isPullStoreLoading]);

  return {
    isLoading: isPullStoreLoading || isRemotePullsLoading,

    login,

    updatedPulls,
    recentlyVisitedPulls,

    Refresh: isPullStoreLoading
      ? () => null
      : () => (
          <MenuBarExtra.Item
            title="Force Refresh"
            onAction={runPullIteration}
            icon={Icon.RotateClockwise}
            shortcut={{ key: "r", modifiers: ["cmd"] }}
          />
        ),

    visitPull,
  };
};

export default usePulls;

type MergePullParams = [string, PullRequestShort[], PullRequestShort[], PullRequestShort[]];
const mergePulls = ([login, authoredPulls, commentedOnPulls, reviewRequestedPulls]: MergePullParams) => {
  const pulls = authoredPulls.concat(commentedOnPulls, reviewRequestedPulls).filter(uniquePullRequests);

  console.debug(
    `mergePulls: merged=${pulls.length} ` +
      `authored=${authoredPulls.length} ` +
      `commented=${commentedOnPulls.length} ` +
      `review-requested=${reviewRequestedPulls.length}`
  );

  return { login, pulls };
};

const uniquePullRequests = (pull: PullRequestShort, index: number, self: PullRequestShort[]) =>
  self.findIndex(p => p.id === pull.id) === index;
