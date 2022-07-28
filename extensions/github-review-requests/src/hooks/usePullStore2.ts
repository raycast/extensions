import {useEffect, useState} from "react";
import {PullRequestLastVisit, PullRequestShort} from "../integration2/types";
import {loadAllPullsFromStore} from "../store/pulls";

const usePullStore2 = () => {
  const [isPullStoreLoading, setIsPullStoreLoading] = useState(true);
  const [updatedPulls, setUpdatedPulls] = useState<PullRequestShort[]>([]);
  const [recentlyVisitedPulls, setRecentlyVisitedPulls] = useState<PullRequestShort[]>([]);
  const [hiddenPulls, setHiddenPulls] = useState<PullRequestLastVisit[]>([]);

  useEffect(() => {
    loadAllPullsFromStore()
      .then(({updatedPulls, recentlyVisitedPulls, hiddenPulls}) => {
        setUpdatedPulls(updatedPulls);
        setRecentlyVisitedPulls(recentlyVisitedPulls);
        setHiddenPulls(hiddenPulls);
      });

    setIsPullStoreLoading(false);
  }, []);

  return {
    isPullStoreLoading,

    updatedPulls,
    recentlyVisitedPulls,
    hiddenPulls
  }
}

export default usePullStore2;
