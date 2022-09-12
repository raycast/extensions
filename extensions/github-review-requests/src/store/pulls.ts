import { LocalStorage } from "@raycast/api";
import { PullRequestLastVisit, PullRequestShort } from "../types";

const updatedPullsKey = "updatedPulls";
const recentlyVisitedPullsKey = "recentlyVisitedPulls";
const hiddenPullsKey = "hiddenPulls";

export type PullStore = {
  updatedPulls: PullRequestShort[];
  recentlyVisitedPulls: PullRequestShort[];
  hiddenPulls: PullRequestLastVisit[];
};

export const loadAllPullsFromStore = (): Promise<PullStore> =>
  Promise.resolve()
    .then(() => console.debug("loadAllPullsFromStore"))
    .then(() =>
      Promise.all([
        LocalStorage.getItem(updatedPullsKey),
        LocalStorage.getItem(recentlyVisitedPullsKey),
        LocalStorage.getItem(hiddenPullsKey),
      ])
    )
    .then(([updatedPulls, recentlyVisitedPulls, hiddenPulls]) => ({
      updatedPulls: parsePulls(updatedPulls),
      recentlyVisitedPulls: parsePulls(recentlyVisitedPulls),
      hiddenPulls: (hiddenPulls ? JSON.parse(hiddenPulls as string) : []) as PullRequestLastVisit[],
    }))
    .then(({ updatedPulls, recentlyVisitedPulls, hiddenPulls }) => {
      console.debug(
        `loadAllPullsFromStore updated=${updatedPulls.length} ` +
          `recentlyVisited=${recentlyVisitedPulls.length} ` +
          `hidden=${hiddenPulls.length}`
      );

      return { updatedPulls, recentlyVisitedPulls, hiddenPulls };
    });

const parsePulls = (serialized: LocalStorage.Value | undefined): PullRequestShort[] =>
  serialized ? JSON.parse(serialized as string) : [];

export const saveUpdatedPullsToStore = (updatedPulls: PullRequestShort[]) =>
  Promise.resolve()
    .then(() => console.debug("saveUpdatedPullsToStore"))
    .then(() => LocalStorage.setItem(updatedPullsKey, JSON.stringify(updatedPulls)))
    .then(() => console.debug(`saveUpdatedPullsToStore updated=${updatedPulls.length}`));

export const saveAllPullsToStore = ({ updatedPulls, recentlyVisitedPulls, hiddenPulls }: PullStore) =>
  Promise.resolve()
    .then(() => console.debug("saveAllPullsToStore"))
    .then(() =>
      Promise.all([
        LocalStorage.setItem(updatedPullsKey, JSON.stringify(updatedPulls)),
        LocalStorage.setItem(recentlyVisitedPullsKey, JSON.stringify(recentlyVisitedPulls)),
        LocalStorage.setItem(hiddenPullsKey, JSON.stringify(hiddenPulls)),
      ])
    )
    .then(() =>
      console.debug(
        `saveAllPullsToStore updated=${updatedPulls.length} ` +
          `recentlyVisited=${recentlyVisitedPulls.length} ` +
          `hidden=${hiddenPulls.length}`
      )
    );
