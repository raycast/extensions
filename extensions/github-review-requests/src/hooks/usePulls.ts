import { useEffect, useState } from "react";
import { open } from "@raycast/api";
import { PullRequestLastVisit, PullSearchResultShort } from "../integration/types";
import usePullsState from "./usePullsState";
import { isActionUserInitiated } from "../tools/isActionUserInitiated";

export type AllPulls = {
  myPulls: PullSearchResultShort[];
  participatedPulls: PullSearchResultShort[];
  hiddenPulls: PullRequestLastVisit[];
  pullVisits: PullRequestLastVisit[];
}

export default function usePulls() {
  const [pullsAreLoading, setPullsAreLoading] = useState(true);
  const {
    isLoading,
    myPulls,
    participatedPulls,
    pullVisits,
    hiddenPulls,
    checkForUpdates,
    arrangeRecentPull
  } = usePullsState();

  const visitPull = (pull: PullSearchResultShort) =>
    open(pull.html_url)
      .then(() => arrangeRecentPull(pull));

  const notifyShortcutExit = () => Promise.resolve()
    .then(() => console.debug(`shortcut exit`));

  useEffect(() => {
    if (isLoading) return;

    Promise.resolve()
      .then(() =>
        isActionUserInitiated()
          ? notifyShortcutExit()
          : checkForUpdates({ myPulls, participatedPulls, pullVisits, hiddenPulls }))
      .finally(() => {
        setPullsAreLoading(false);
        console.debug("done");
      });
  }, [isLoading]);

  return { isLoading: pullsAreLoading, myPulls, participatedPulls, pullVisits, visitPull };
}

