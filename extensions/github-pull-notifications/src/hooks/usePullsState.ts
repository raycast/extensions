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

type StoreUpdatesParams = {
  allPulls: PullSearchResultShort[],
  myPulls: PullSearchResultShort[],
  participatedPulls: PullSearchResultShort[]
};

const usePullsState = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [pullVisits, setPullVisits] = useState<PullRequestLastVisit[]>([]);
  const [hiddenPulls, setHiddenPulls] = useState<PullRequestLastVisit[]>([]);

  const storeUpdates = ({allPulls, myPulls, participatedPulls}: StoreUpdatesParams) => {
    console.debug("storeUpdates");

    const filteredHiddenPulls = hiddenPulls.filter(visit => !allPulls.includes(visit.pull));

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setHiddenPulls(filteredHiddenPulls);

    return Promise.all([
      storeMyPulls(myPulls),
      storeParticipatedPulls(participatedPulls)
    ])
      .then(() => console.debug(
        `storeUpdates: allPulls=${allPulls.length} `+
        `hiddenPulls=${filteredHiddenPulls.length} `+
        `myPulls=${myPulls.length} `+
        `participatedPulls=${participatedPulls.length} `+
        `done`
      ))
  };

  const setAllPullsToState = ({ myPulls, participatedPulls, pullVisits, hiddenPulls }: AllPulls) => {
    console.debug(`setAllPullsToState`);

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setPullVisits(pullVisits);
    setHiddenPulls(hiddenPulls);

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
    hiddenPulls,

    checkForUpdates: (allPulls: AllPulls) =>
      checkPullsForUpdates(allPulls)
        .then(storeUpdates),

    arrangeRecentPull: (pull: PullSearchResultShort) =>
      Promise.resolve()
        .then(() => hiddenPulls.filter(hiddenPull => hiddenPull.pull.number !== pull.number))
        .then(hiddenPulls => hiddenPulls.concat({ pull, last_visit: getTimestampISOInSeconds() }))
        .then(hiddenPulls => {
          const apply = {
            myPulls: myPulls.filter(myPull => myPull.number !== pull.number),
            participatedPulls: participatedPulls.filter(
              participatedPull => participatedPull.number !== pull.number
            ),
            hiddenPulls,
            pullVisits: [
              {pull, last_visit: getTimestampISOInSeconds()},
              ...pullVisits.filter(pullVisit => pullVisit.pull.number !== pull.number)
            ].slice(0, 20)
          };

          setAllPullsToState(apply);

          return setPullsToLocalStorage(apply);
        })
        .then(() => console.debug(`arrangeRecentPull completed`))
  };
};

export default usePullsState;