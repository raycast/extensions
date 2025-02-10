import { LocalStorage } from "@raycast/api";
import { PullRequestShort } from "../types";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";

const updatedPullsKey = "updatedPulls";
const recentlyVisitedPullsKey = "recentlyVisitedPulls";

export type PullStore = {
  updatedPulls: PullRequestShort[];
  recentlyVisitedPulls: PullRequestShort[];
};

export const loadAllPullsFromStore = (): Promise<PullStore> =>
  Promise.resolve()
    .then(() => console.debug("loadAllPullsFromStore"))
    .then(() => Promise.all([LocalStorage.getItem(updatedPullsKey), LocalStorage.getItem(recentlyVisitedPullsKey)]))
    .then(([updatedPulls, recentlyVisitedPulls]) => ({
      updatedPulls: parsePulls(updatedPulls),
      recentlyVisitedPulls: parsePulls(recentlyVisitedPulls),
    }))
    .then(({ updatedPulls, recentlyVisitedPulls }) => {
      console.debug(
        `loadAllPullsFromStore updated=${updatedPulls.length} ` + `recentlyVisited=${recentlyVisitedPulls.length} `
      );

      return { updatedPulls, recentlyVisitedPulls };
    });

export const loadAllPullsFromRemote = (defaultFilters: string[]): Promise<PullRequestShort[]> =>
  Promise.resolve()
    .then(() => console.debug("loadAllPullsFromRemote"))
    .then(() =>
      Promise.all([
        searchPullRequestsWithDependencies(defaultFilters.concat(["author:@me"]).join(" ")),
        searchPullRequestsWithDependencies(defaultFilters.concat(["review-requested:@me"]).join(" ")),
      ])
    )
    .then(([authoredPulls, reviewRequestedPulls]: [PullRequestShort[], PullRequestShort[]]) =>
      authoredPulls.concat(reviewRequestedPulls)
    )
    .then((pulls: PullRequestShort[]) =>
      pulls.reduce((acc, current) => {
        const isDuplicate = acc.find(pr => pr.id === current.id);
        if (!isDuplicate) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as PullRequestShort[])
    )
    .then((pulls: PullRequestShort[]) => {
      console.debug(`loadAllPullsFromRemote updated=${pulls.length}`);

      return pulls;
    });

const parsePulls = (serialized: LocalStorage.Value | undefined): PullRequestShort[] =>
  serialized ? JSON.parse(serialized as string) : [];

export const saveUpdatedPullsToStore = (updatedPulls: PullRequestShort[]) =>
  Promise.resolve()
    .then(() => console.debug("saveUpdatedPullsToStore"))
    .then(() => LocalStorage.setItem(updatedPullsKey, JSON.stringify(updatedPulls)))
    .then(() => console.debug(`saveUpdatedPullsToStore updated=${updatedPulls.length}`));

export const saveRecentVisitedPullsToStore = (recentlyVisitedPulls: PullRequestShort[]) =>
  Promise.resolve()
    .then(() => console.debug("saveRecentVisitedPullsToStore"))
    .then(() => LocalStorage.setItem(recentlyVisitedPullsKey, JSON.stringify(recentlyVisitedPulls)))
    .then(() => console.debug(`saveRecentVisitedPullsToStore updated=${recentlyVisitedPulls.length}`));
