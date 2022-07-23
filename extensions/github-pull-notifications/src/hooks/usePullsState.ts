import { useState } from "react";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { checkPullsForUpdates } from "../flows/checkPullsForUpdates";
import { storeMyPulls, storeParticipatedPulls } from "../flows/store";
import { AllPulls } from "./usePulls";

const usePullsState = () => {
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

  return {
    myPulls,
    participatedPulls,
    pullVisits,

    setAllPullsToState: ({ myPulls, participatedPulls, pullVisits }: AllPulls) => {
      console.debug(`setAllPullsToState`);

      setMyPulls(myPulls);
      setParticipatedPulls(participatedPulls);
      setPullVisits(pullVisits);

      console.debug(`setAllPullsToState done`);

      return { myPulls, participatedPulls, pullVisits };
    },

    checkForUpdates: (allPulls: AllPulls) =>
      checkPullsForUpdates(allPulls)
        .then(storeUpdates)
  };
};

export default usePullsState;