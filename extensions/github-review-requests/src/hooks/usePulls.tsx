import usePullStore from "./usePullStore";
import { useEffect, useState, useMemo } from "react";
import { getLogin } from "../integration/getLogin";
import { PullRequestShort } from "../types";
import { getPreferenceValues } from "@raycast/api";
import { loadConfig, normalizeAuthor } from "../attention/lib/config";

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

  const openPulls = useMemo(
    () =>
      updatedPulls.map(({ owner, ...rest }) => ({
        owner: owner.login,
        ...rest,
      })),
    [updatedPulls],
  );

  const runPullIteration = () =>
    Promise.resolve()
      .then(() => console.debug("runPullIteration >>>>>>>>>"))
      .then(() => setIsRemotePullsLoading(true))
      .then(() => loadConfig())
      .then(config => {
        const orgFilters = config.activeOrgs.map(org => `org:${org}`);
        return fetchPulls([
          "is:open",
          "draft:false",
          "archived:false",
          ...(orgFilters.length > 0 ? orgFilters : [userFilters]),
        ]).then(pulls => {
          return pulls.filter(
            pull => !config.ignoredAuthors.some(author => normalizeAuthor(author) === normalizeAuthor(pull.user.login)),
          );
        });
      })
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
      .then(() => runPullIteration())
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
