import { LocalStorage } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";

const myPullsKey = "myPulls";
const participatedPullsKey = "participatedPulls";
const pullVisitsKey = "pullVisits";

type UndefinedString = string | undefined

export const loadPullsFromLocalStorage = () =>
  Promise.all([
    LocalStorage.getItem(myPullsKey).then(data => data as UndefinedString),
    LocalStorage.getItem(participatedPullsKey).then(data => data as UndefinedString),
    LocalStorage.getItem(pullVisitsKey).then(data => data as UndefinedString)
  ])
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
    storePullVisits(pullVisits),
  ]);

export const storeMyPulls = (myPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(myPullsKey, JSON.stringify(myPulls));

export const storeParticipatedPulls = (participatedPulls: PullSearchResultShort[]) =>
  LocalStorage.setItem(participatedPullsKey, JSON.stringify(participatedPulls));

const storePullVisits = (pullVisits: PullRequestLastVisit[]) =>
  LocalStorage.setItem(pullVisitsKey, JSON.stringify(pullVisits));
