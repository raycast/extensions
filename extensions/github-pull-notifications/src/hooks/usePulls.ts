import { useEffect, useState } from "react";
import { environment, LaunchType, open } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import {
  loadAllPullsFromLocalStorage,
  setPullsToLocalStorage,
  storeMyPulls,
  storeParticipatedPulls
} from "../flows/store";
import { getTimestampISOInSeconds } from "../tools/getTimestampISOInSeconds";
import { checkPullsForUpdates } from "../flows/checkPullsForUpdates";

export type AllPulls = {
  myPulls: PullSearchResultShort[];
  participatedPulls: PullSearchResultShort[];
  pullVisits: PullRequestLastVisit[];
}

export default function usePulls() {
  const [isLoading, setIsLoading] = useState(true);
  const [myPulls, setMyPulls] = useState<PullSearchResultShort[]>([]);
  const [participatedPulls, setParticipatedPulls] = useState<PullSearchResultShort[]>([]);
  const [pullVisits, setPullVisits] = useState<PullRequestLastVisit[]>([]);

  const addRecentPull = (pull: PullSearchResultShort) =>
    Promise.resolve()
      .then(() => pullVisits.filter(recentVisit => recentVisit.pull.number !== pull.number))
      .then(filtered => [{ pull, last_visit: getTimestampISOInSeconds() }, ...filtered])
      .then(pullVisits => {
        const myPullsFiltered = myPulls.filter(myPull => myPull.number !== pull.number);
        const participatedPullsFiltered = participatedPulls.filter(
          participatedPull => participatedPull.number !== pull.number
        );

        setPullVisits(pullVisits);
        setMyPulls(myPullsFiltered);
        setParticipatedPulls(participatedPullsFiltered);

        return setPullsToLocalStorage(myPullsFiltered, participatedPullsFiltered, pullVisits);
      })
      .then(() => console.debug(`addRecentPull completed`));

  const visitPull = (pull: PullSearchResultShort) =>
    open(pull.html_url)
      .then(() => addRecentPull(pull));

  const setAllPullsToState = ({ myPulls, participatedPulls, pullVisits }: AllPulls) => {
    console.debug(`setAllPullsToState`);

    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setPullVisits(pullVisits);

    console.debug(`setAllPullsToState done`);

    return { myPulls, participatedPulls, pullVisits };
  };

  const notifyShortcutExit = () => Promise.resolve()
    .then(() => console.debug(`shortcut exit`));

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

  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.clear())
      .then(() => console.debug("usePulls hook"))
      .then(loadAllPullsFromLocalStorage)
      .then(setAllPullsToState)
      .then((allPulls) => actionIsUserInitiated() ? notifyShortcutExit() : checkForUpdates(allPulls))
      .finally(() => {
        setIsLoading(false);
        console.debug("done");
      });
  }, []);

  return { isLoading, myPulls, participatedPulls, pullVisits, visitPull };
}

const actionIsUserInitiated = () => {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  console.debug(`actionIsUserInitiated: ${userInitiated}`);

  return userInitiated;
};
