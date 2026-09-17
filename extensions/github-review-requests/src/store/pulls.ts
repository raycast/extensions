import { LocalStorage } from "@raycast/api";
import { MenuPullRequest, PullRequestShort } from "../types";
import searchPullRequestsWithDependencies from "../graphql/searchPullRequestsWithDependencies";

const updatedPullsKey = "updatedPulls";
const recentlyVisitedPullsKey = "recentlyVisitedPulls";

export type PullStore = {
  updatedPulls: PullRequestShort[];
  recentlyVisitedPulls: MenuPullRequest[];
};

export const loadAllPullsFromStore = (): Promise<PullStore> =>
  Promise.resolve()
    .then(() => console.debug("loadAllPullsFromStore"))
    .then(() => Promise.all([LocalStorage.getItem(updatedPullsKey), LocalStorage.getItem(recentlyVisitedPullsKey)]))
    .then(([updatedPulls, recentlyVisitedPulls]) => ({
      updatedPulls: parsePulls<PullRequestShort>(updatedPulls),
      recentlyVisitedPulls: parsePulls<MenuPullRequest>(recentlyVisitedPulls),
    }))
    .then(({ updatedPulls, recentlyVisitedPulls }) => {
      console.debug(
        `loadAllPullsFromStore updated=${updatedPulls.length} ` + `recentlyVisited=${recentlyVisitedPulls.length} `,
      );

      return { updatedPulls, recentlyVisitedPulls };
    });

/**
 * Loads the menu's pull requests: the ones you opened, the ones awaiting your
 * review, and — when `watchedFilters` is given — every open pull request in the
 * repositories you watch, whoever opened them. The first two searches are
 * unchanged; anything only the third turns up is tagged `inWatchedScope` so the
 * menu can keep it out of the review-request group.
 */
export const loadAllPullsFromRemote = (
  defaultFilters: string[],
  watchedFilters?: string[],
): Promise<PullRequestShort[]> =>
  Promise.resolve()
    .then(() => console.debug("loadAllPullsFromRemote"))
    .then(() =>
      Promise.all([
        searchPullRequestsWithDependencies(defaultFilters.concat(["author:@me"]).join(" ")),
        searchPullRequestsWithDependencies(defaultFilters.concat(["review-requested:@me"]).join(" ")),
        watchedFilters?.length
          ? searchPullRequestsWithDependencies(watchedFilters.join(" ")).then(pulls =>
              pulls.map(pull => ({ ...pull, inWatchedScope: true })),
            )
          : Promise.resolve([] as PullRequestShort[]),
      ]),
    )
    .then(([authoredPulls, reviewRequestedPulls, watchedPulls]) =>
      authoredPulls.concat(reviewRequestedPulls).concat(watchedPulls),
    )
    .then((pulls: PullRequestShort[]) =>
      pulls.reduce((acc, current) => {
        const isDuplicate = acc.find(pr => pr.id === current.id);
        if (!isDuplicate) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as PullRequestShort[]),
    )
    .then((pulls: PullRequestShort[]) => {
      console.debug(`loadAllPullsFromRemote updated=${pulls.length}`);

      return pulls;
    });

const parsePulls = <T>(serialized: LocalStorage.Value | undefined): T[] =>
  serialized ? (JSON.parse(serialized as string) as T[]) : [];

export const saveUpdatedPullsToStore = (updatedPulls: PullRequestShort[]) =>
  Promise.resolve()
    .then(() => console.debug("saveUpdatedPullsToStore"))
    .then(() => LocalStorage.setItem(updatedPullsKey, JSON.stringify(updatedPulls)))
    .then(() => console.debug(`saveUpdatedPullsToStore updated=${updatedPulls.length}`));

export const saveRecentVisitedPullsToStore = (recentlyVisitedPulls: MenuPullRequest[]) =>
  Promise.resolve()
    .then(() => console.debug("saveRecentVisitedPullsToStore"))
    .then(() => LocalStorage.setItem(recentlyVisitedPullsKey, JSON.stringify(recentlyVisitedPulls)))
    .then(() => console.debug(`saveRecentVisitedPullsToStore updated=${recentlyVisitedPulls.length}`));
