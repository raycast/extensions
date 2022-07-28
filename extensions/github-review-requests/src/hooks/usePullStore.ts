import { useEffect, useState } from "react";
import { PullRequestLastVisit, PullRequestShort } from "../types";
import { loadAllPullsFromStore, PullStore, saveAllPullsToStore, saveUpdatedPullsToStore } from "../store/pulls";
import { getTimestampISOInSeconds } from "../util";

const usePullStore = () => {
  const [isPullStoreLoading, setIsPullStoreLoading] = useState(true);
  const [updatedPulls, setUpdatedPulls] = useState<PullRequestShort[]>([]);
  const [recentlyVisitedPulls, setRecentlyVisitedPulls] = useState<PullRequestShort[]>([]);
  const [hiddenPulls, setHiddenPulls] = useState<PullRequestLastVisit[]>([]);

  useEffect(() => {
    loadAllPullsFromStore()
      .then(({ updatedPulls, recentlyVisitedPulls, hiddenPulls }) => {
        setUpdatedPulls(updatedPulls);
        setRecentlyVisitedPulls(recentlyVisitedPulls);
        setHiddenPulls(hiddenPulls);
      })
      .finally(() => setIsPullStoreLoading(false));
  }, []);

  return {
    isPullStoreLoading,

    updatedPulls,
    recentlyVisitedPulls,
    hiddenPulls,

    visitPull: (pull: PullRequestShort) =>
      Promise.resolve()
        .then(() => getTimestampISOInSeconds())
        .then(
          (lastVisitedAt) =>
            ({
              updatedPulls:
                pull.requestedReviewers.length > 0 ? updatedPulls : updatedPulls.filter((pr) => pr.id !== pull.id),

              recentlyVisitedPulls: [
                pull,
                ...recentlyVisitedPulls.filter((pr) => pr.id !== pull.id).slice(0, 19),
              ] as PullRequestShort[],

              hiddenPulls:
                pull.requestedReviewers.length > 0
                  ? hiddenPulls
                  : ([
                      { id: pull.id, lastVisitedAt },
                      ...hiddenPulls.filter((pr) => pr.id !== pull.id),
                    ] as PullRequestLastVisit[]),
            } as PullStore)
        )
        .then(({ updatedPulls, recentlyVisitedPulls, hiddenPulls }: PullStore) => {
          setUpdatedPulls(updatedPulls);
          setRecentlyVisitedPulls(recentlyVisitedPulls);
          setHiddenPulls(hiddenPulls);

          return saveAllPullsToStore({ updatedPulls, recentlyVisitedPulls, hiddenPulls });
        }),

    updatePulls: (pulls: PullRequestShort[]) => {
      setUpdatedPulls(pulls);

      return saveUpdatedPullsToStore(pulls);
    },
  };
};

export default usePullStore;
