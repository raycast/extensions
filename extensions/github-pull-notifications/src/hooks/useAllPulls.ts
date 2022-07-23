import { useState } from "react";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { checkPullsForUpdates } from "../flows/checkPullsForUpdates";
import { storeMyPulls, storeParticipatedPulls } from "../flows/store";
import { AllPulls } from "./usePulls";

const useAllPulls = () => {
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [pullVisits, setPullVisits] = useState<PullRequestLastVisit[]>([]);

  const setAllPullsToState = ({ myPulls, participatedPulls, pullVisits }: AllPulls) => {
    console.debug(`setAllPullsToState`);

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setPullVisits(pullVisits);

    console.debug(`setAllPullsToState done`);

    return { myPulls, participatedPulls, pullVisits };
  };

  const checkForUpdates = (allPulls: AllPulls) =>
    checkPullsForUpdates(allPulls)
      .then(([myPulls, participatedPulls]) => {
        console.log("got my pulls", myPulls.length);
        console.log("got participated pulls", participatedPulls.length);

        setMyPulls(myPulls);
        setParticipatedPulls(participatedPulls);

        return Promise.all([
          storeMyPulls(myPulls),
          storeParticipatedPulls(participatedPulls)
        ])
          .then(() => console.debug("stored my pulls and participated pulls"));
      });

  return {
    myPulls,
    participatedPulls,
    pullVisits,

    checkForUpdates,
    setAllPullsToState
  };
};

export default useAllPulls;