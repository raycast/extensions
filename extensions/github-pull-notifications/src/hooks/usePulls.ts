import { useEffect, useState } from "react";
import { open } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { loadAllPullsFromLocalStorage, setPullsToLocalStorage } from "../flows/store";
import { getTimestampISOInSeconds } from "../tools/getTimestampISOInSeconds";
import usePullsState from "./usePullsState";
import { isActionUserInitiated } from "../tools/isActionUserInitiated";

export type AllPulls = {
  myPulls: PullSearchResultShort[];
  participatedPulls: PullSearchResultShort[];
  pullVisits: PullRequestLastVisit[];
}

export default function usePulls() {
  const [isLoading, setIsLoading] = useState(true);
  const { myPulls, participatedPulls, pullVisits, setAllPullsToState, checkForUpdates } = usePullsState();

  const addRecentPull = (pull: PullSearchResultShort) =>
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
      .then(() => console.debug(`addRecentPull completed`));

  const visitPull = (pull: PullSearchResultShort) =>
    open(pull.html_url)
      .then(() => addRecentPull(pull));

  const notifyShortcutExit = () => Promise.resolve()
    .then(() => console.debug(`shortcut exit`));

  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.clear())
      .then(() => console.debug("usePulls hook"))
      .then(loadAllPullsFromLocalStorage)
      .then(setAllPullsToState)
      .then((allPulls) => isActionUserInitiated() ? notifyShortcutExit() : checkForUpdates(allPulls))
      .finally(() => {
        setIsLoading(false);
        console.debug("done");
      });
  }, []);

  return { isLoading, myPulls, participatedPulls, pullVisits, visitPull };
}

