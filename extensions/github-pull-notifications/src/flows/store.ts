import { LocalStorage } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import { AllPulls } from "../hooks/usePulls";

const myPullsKey = "myPulls";
const participatedPullsKey = "participatedPulls";
const pullVisitsKey = "pullVisits";
const hiddenPullsKey = "hiddenPulls";

type UndefinedString = string | undefined

export const loadAllPullsFromLocalStorage = (): Promise<AllPulls> => Promise.resolve()
  .then(() => console.debug("loadAllPullsFromLocalStorage"))
  .then(() => Promise.all([
    LocalStorage.getItem(myPullsKey).then(serialized => serialized as UndefinedString),
    LocalStorage.getItem(participatedPullsKey).then(serialized => serialized as UndefinedString),
    LocalStorage.getItem(pullVisitsKey).then(serialized => serialized as UndefinedString),
    LocalStorage.getItem(hiddenPullsKey).then(serialized => serialized as UndefinedString),
  ]))
  .then(([myPullsSerialized, participatedPullsSerialized, pullVisitsSerialized, hiddenPullsSerialized]) => {
    let myPulls: PullSearchResultShort[] = [];
    let participatedPulls: PullSearchResultShort[] = [];
    let pullVisits: PullRequestLastVisit[] = [];
    let hiddenPulls: PullRequestLastVisit[] = [];

    if (myPullsSerialized) {
      myPulls = (JSON.parse(myPullsSerialized) || []) as PullSearchResultShort[];
    }

    if (participatedPullsSerialized) {
      participatedPulls = (JSON.parse(participatedPullsSerialized) || []) as PullSearchResultShort[];
    }

    if (pullVisitsSerialized) {
      pullVisits = (JSON.parse(pullVisitsSerialized) || []) as PullRequestLastVisit[];
    }

    if (hiddenPullsSerialized) {
      hiddenPulls = (JSON.parse(hiddenPullsSerialized) || []) as PullRequestLastVisit[];
    }

    console.debug(`loadAllPullsFromLocalStorage: myPulls=${myPulls.length}, participatedPulls=${participatedPulls.length}, pullVisits=${pullVisits.length}`);

    return { myPulls, participatedPulls, pullVisits, hiddenPulls };
  });

export const setPullsToLocalStorage = ({myPulls, participatedPulls, hiddenPulls, pullVisits}: AllPulls) =>
  Promise.all([
    storeMyPulls(myPulls),
    storeParticipatedPulls(participatedPulls),
    storeHiddenPulls(hiddenPulls),
    storePullVisits(pullVisits)
  ]);

export const storeMyPulls = (myPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(myPullsKey, JSON.stringify(myPulls));

export const storeParticipatedPulls = (participatedPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(participatedPullsKey, JSON.stringify(participatedPulls));

const storeHiddenPulls = (hiddenPulls: PullRequestLastVisit[]) =>
  LocalStorage.setItem(pullVisitsKey, JSON.stringify(hiddenPulls));

const storePullVisits = (pullVisits: PullRequestLastVisit[]) =>
  LocalStorage.setItem(pullVisitsKey, JSON.stringify(pullVisits));
