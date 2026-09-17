import { useEffect, useState } from "react";
import { MenuPullRequest, PullRequestShort } from "../types";
import {
  loadAllPullsFromStore,
  loadAllPullsFromRemote,
  saveUpdatedPullsToStore,
  saveRecentVisitedPullsToStore,
} from "../store/pulls";
import { getTimestampISOInSeconds } from "../util";

const usePullStore = () => {
  const [isPullStoreLoading, setIsPullStoreLoading] = useState(true);
  const [updatedPulls, setUpdatedPulls] = useState<PullRequestShort[]>([]);
  const [recentlyVisitedPulls, setRecentlyVisitedPulls] = useState<MenuPullRequest[]>([]);

  useEffect(() => {
    loadAllPullsFromStore()
      .then(({ updatedPulls, recentlyVisitedPulls }) => {
        setUpdatedPulls(updatedPulls);
        setRecentlyVisitedPulls(recentlyVisitedPulls);
      })
      .finally(() => setIsPullStoreLoading(false));
  }, []);

  return {
    isPullStoreLoading,

    updatedPulls,
    recentlyVisitedPulls,

    visitPull: (pull: MenuPullRequest) =>
      Promise.resolve()
        .then(() => getTimestampISOInSeconds())
        .then(() => [pull, ...recentlyVisitedPulls.filter(pr => pr.id !== pull.id).slice(0, 9)] as MenuPullRequest[])
        .then((recentlyVisitedPulls: MenuPullRequest[]) => {
          setRecentlyVisitedPulls(recentlyVisitedPulls);

          return saveRecentVisitedPullsToStore(recentlyVisitedPulls);
        }),

    updatePulls: (pulls: PullRequestShort[]) => {
      setUpdatedPulls(pulls);

      return saveUpdatedPullsToStore(pulls);
    },
    fetchPulls: (options: string[], watchedOptions?: string[]) => loadAllPullsFromRemote(options, watchedOptions),
  };
};

export default usePullStore;
