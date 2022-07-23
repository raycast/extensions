import { useEffect, useState } from "react";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { checkPullsForUpdates } from "../flows/checkPullsForUpdates";
import {
  loadAllPullsFromLocalStorage,
  setPullsToLocalStorage,
  storeMyPulls,
  storeParticipatedPulls
} from "../flows/store";
import { AllPulls } from "./usePulls";
import { getTimestampISOInSeconds } from "../tools/getTimestampISOInSeconds";

const usePullsState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [pullVisits, setPullVisits] = useState<PullRequestLastVisit[]>([]);

  const storeUpdates = ([myPulls, participatedPulls]: [PullSearchResultShort[], PullSearchResultShort[]]) => {
    console.debug(`storeUpdates: myPulls=${myPulls.length} participatedPulls=${participatedPulls.length}`);

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);

    return Promise.all([
      storeMyPulls(myPulls),
      storeParticipatedPulls(participatedPulls)
    ])
      .then(() => console.debug("storeUpdates: done"));
  };

  const setAllPullsToState = ({ myPulls, participatedPulls, pullVisits }: AllPulls) => {
    console.debug(`setAllPullsToState`);

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setPullVisits(pullVisits);

    console.debug(`setAllPullsToState done`);

    return { myPulls, participatedPulls, pullVisits };
  };

  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.clear())
      .then(() => console.debug("usePullsState hook"))
      .then(loadAllPullsFromLocalStorage)
      .then(setAllPullsToState)
      .finally(() => setIsLoading(false));
  }, []);

  return {
    isLoading,

    myPulls,
    participatedPulls,
    pullVisits,

    setAllPullsToState,

    checkForUpdates: (allPulls: AllPulls) =>
      checkPullsForUpdates(allPulls)
        .then(storeUpdates),

    arrangeRecentPull: (pull: PullSearchResultShort) =>
      Promise.resolve()
        .then(() => pullVisits.filter(recentVisit => recentVisit.pull.number !== pull.number))
        .then(filtered => [{ pull, last_visit: getTimestampISOInSeconds() }, ...filtered])
        .then(pullVisits => {
          const myPullsFiltered = myPulls.filter(myPull => myPull.number !== pull.number);
          const participatedPullsFiltered = participatedPulls.filter(
            participatedPull => participatedPull.number !== pull.number
          );

          setAllPullsToState({ myPulls: myPullsFiltered, participatedPulls: participatedPullsFiltered, pullVisits });

          return setPullsToLocalStorage(myPullsFiltered, participatedPullsFiltered, pullVisits);
        })
        .then(() => console.debug(`addRecentPull completed`))
  };
};

export default usePullsState;