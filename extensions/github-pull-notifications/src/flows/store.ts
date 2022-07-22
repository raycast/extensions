import { LocalStorage } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";

const myPullsKey = "myPulls";
const participatedPullsKey = "participatedPulls";
const pullVisitsKey = "pullVisits";

export const loadPullsFromLocalStorage = () =>
  Promise.all([
    LocalStorage.getItem(myPullsKey).then(data => data as string | undefined),
    LocalStorage.getItem(participatedPullsKey).then(data => data as string | undefined),
    LocalStorage.getItem(pullVisitsKey).then(data => data as string | undefined)
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
    LocalStorage.setItem(myPullsKey, JSON.stringify(myPulls)),
    LocalStorage.setItem(participatedPullsKey, JSON.stringify(participatedPulls)),
    LocalStorage.setItem(pullVisitsKey, JSON.stringify(pullVisits))
  ]);

