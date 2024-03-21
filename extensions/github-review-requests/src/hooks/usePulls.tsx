import usePullStore from "./usePullStore";
import { useEffect, useState, useMemo } from "react";
import { getLogin } from "../integration/getLogin";
import { isActionUserInitiated } from "../util";
import { PullRequestShort } from "../types";
import { getPreferenceValues } from "@raycast/api";

const { owners } = getPreferenceValues();

const usePulls = () => {
  const { isPullStoreLoading, updatedPulls, recentlyVisitedPulls, visitPull, updatePulls, fetchPulls } = usePullStore();

  const [isRemotePullsLoading, setIsRemotePullsLoading] = useState(true);
  const [login, setLogin] = useState("");

  const userFilters: string = owners
    ? owners
        .split(",")
        .map((user: string) => `user:${user.toString().trim()}`)
        .join(" ")
    : "";
  const exitShortcut = () => console.debug("usePulls: exitShortcut");
  const defaultFilters: string[] = ["is:open", "draft:false", "archived:false", userFilters];

  const openPulls = useMemo(
    () =>
      updatedPulls.map(({ owner, ...rest }) => ({
        owner: owner.login,
        ...rest,
      })),
    [updatedPulls]
  );

  const runPullIteration = () =>
    Promise.resolve()
      .then(() => console.debug("runPullIteration >>>>>>>>>"))
      .then(() => setIsRemotePullsLoading(true))
      .then(() => fetchPulls(defaultFilters))
      .then((pulls: PullRequestShort[]) => updatePulls(pulls))
      .then(() => console.debug("<<<<<<<<< runPullIteration"))
      .finally(() => setIsRemotePullsLoading(false));

  useEffect(() => {
    // Run effect only after we load from store.
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
    openPulls,
    recentlyVisitedPulls,
    isReady: !isPullStoreLoading,
    visitPull,
    runPullIteration,
  };
};

export default usePulls;
