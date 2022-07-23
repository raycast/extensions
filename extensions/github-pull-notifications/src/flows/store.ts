import { LocalStorage } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";

const myPullsKey = "myPulls";
const participatedPullsKey = "participatedPulls";
const pullVisitsKey = "pullVisits";

type UndefinedString = string | undefined

export const loadAllPullsFromLocalStorage = () => Promise.resolve()
  .then(() => console.debug("loadAllPullsFromLocalStorage"))
  .then(() => Promise.all([
    LocalStorage.getItem(myPullsKey).then(serialized => serialized as UndefinedString),
    LocalStorage.getItem(participatedPullsKey).then(serialized => serialized as UndefinedString),
    LocalStorage.getItem(pullVisitsKey).then(serialized => serialized as UndefinedString)
  ]))
  .then(([myPullsSerialized, participatedPullsSerialized, pullVisitsSerialized]) => {
    let myPulls: PullSearchResultShort[] = [];
    let participatedPulls: PullSearchResultShort[] = [];
    let pullVisits: PullRequestLastVisit[] = [];

    if (myPullsSerialized) {
      myPulls = (JSON.parse(myPullsSerialized) || []) as PullSearchResultShort[];
    }

    if (participatedPullsSerialized) {
      participatedPulls = (JSON.parse(participatedPullsSerialized) || []) as PullSearchResultShort[];
    }

    if (pullVisitsSerialized) {
      pullVisits = (JSON.parse(pullVisitsSerialized) || []) as PullRequestLastVisit[];
    }

    console.debug(`loadAllPullsFromLocalStorage: myPulls=${myPulls.length}, participatedPulls=${participatedPulls.length}, pullVisits=${pullVisits.length}`);

    return { myPulls, participatedPulls, pullVisits };
  });

export const setPullsToLocalStorage = (
  myPulls: PullSearchResultShort[],
  participatedPulls: PullSearchResultShort[],
  pullVisits: PullRequestLastVisit[]
) =>
  Promise.all([
    storeMyPulls(myPulls),
    storeParticipatedPulls(participatedPulls),
    storePullVisits(pullVisits)
  ]);

export const storeMyPulls = (myPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(myPullsKey, JSON.stringify(myPulls));

export const storeParticipatedPulls = (participatedPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(participatedPullsKey, JSON.stringify(participatedPulls));

const storePullVisits = (pullVisits: PullRequestLastVisit[]) =>
  LocalStorage.setItem(pullVisitsKey, JSON.stringify(pullVisits));
