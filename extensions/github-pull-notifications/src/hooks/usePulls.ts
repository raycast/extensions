import { useEffect, useState } from "react";
import { environment, LaunchType, open } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { getLogin } from "../integration/getLogin";
import { pullSearch } from "../integration/pullSearch";
import {
  loadAllPullsFromLocalStorage,
  setPullsToLocalStorage,
  storeMyPulls,
  storeParticipatedPulls
} from "../flows/store";
import { filterPulls } from "../flows/filterPulls";

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
      .then(filtered => [{pull, last_visit: getTimestampISOInSeconds()}, ...filtered])
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

  const setAllPullsToState = ({myPulls, participatedPulls, pullVisits}: AllPulls) => {
    setMyPulls(myPulls);
    setParticipatedPulls(participatedPulls);
    setPullVisits(pullVisits);

    return {myPulls, participatedPulls, pullVisits};
  };

  const notifyShortcutExit = () => Promise.resolve()
    .then(() => console.debug(`shortcut exit`));

  const checkForUpdates = ({pullVisits}: AllPulls) =>
    getLogin()
      .then(login =>
        Promise.all([
          fetchMyPulls(),
          fetchParticipatedPulls()
        ])
          .then(([myPulls, participatedPulls]) =>
            Promise.all([
              filterPulls(login, pullVisits, myPulls),
              filterPulls(login, pullVisits, participatedPulls)
            ]))
          .then(([myPulls, participatedPulls]) => {
            console.log("got my pulls", myPulls.length);
            console.log("got participated pulls", participatedPulls.length);

            setMyPulls(myPulls);
            setParticipatedPulls(participatedPulls);

            return Promise.all([
              storeMyPulls(myPulls),
              storeParticipatedPulls(participatedPulls),
            ])
              .then(() => console.debug("stored my pulls and participated pulls"))
          }));

  useEffect(() => {
    Promise.resolve()
      // .then(() => LocalStorage.clear())
      .then(() => console.debug("begin initialization flow"))
      .then(loadAllPullsFromLocalStorage)
      .then(setAllPullsToState)
      .then((allPulls) => actionIsUserInitiated() ? notifyShortcutExit() : checkForUpdates(allPulls))
      .finally(() => {
        setIsLoading(false);
        console.debug("done");
      });
  }, []);

  return {isLoading, myPulls, participatedPulls, pullVisits, visitPull};
}

const actionIsUserInitiated = () => {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  console.debug(`actionIsUserInitiated: ${userInitiated}`);

  return userInitiated;
}

const fetchMyPulls = () => pullSearch("is:open archived:false author:@me");
const fetchParticipatedPulls = () => pullSearch("is:open archived:false commenter:@me");
const getTimestampISOInSeconds = () => new Date().toISOString().substring(0, 19) + "Z";
