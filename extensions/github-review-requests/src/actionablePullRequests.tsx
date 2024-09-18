import { MenuBarExtra, open, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import usePulls from "./hooks/usePulls";
import { groupedByAttribute } from "./util";
import { PullRequestShort, ReviewDecision } from "./types";
import PullRequestItem from "./components/PullRequestItem";

interface PullRequestGroup {
  [owner: string]: PullRequestShort[];
}

const actionablePullRequests = () => {
  const { isLoading, isReady, login, openPulls, recentlyVisitedPulls, visitPull, runPullIteration } = usePulls();

  const title = useMemo(() => (openPulls.length > 0 ? `${openPulls.length}` : "🎉"), [openPulls]);

  const pullsByOwner = useMemo(() => groupedByAttribute(openPulls, "owner") as PullRequestGroup, [openPulls]);

  return (
    <MenuBarExtra isLoading={isLoading} icon="icon.png" title={title} tooltip="Your Pull Requests">
      {openPulls.length === 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="🧹 No upcoming PRs." />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Recent" icon={Icon.Clock}>
          {recentlyVisitedPulls.map(pull => (
            <PullRequestItem key={pull.id} pull={pull} onAction={() => open(pull.url)} />
          ))}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <>
        {Object.entries(pullsByOwner).map(([owner, pulls]) => {
          if (pulls.length === 0) {
            return null;
          }

          const approvedPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.APPROVED && user?.login === login
          );
          const changeRequestedPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.CHANGES_REQUESTED && user?.login === login
          );
          // NOTE: both the `REVIEW_REQUIRED` and `null` statuses indicate that the PR is waiting for a review.
          // Refer to: https://github.com/orgs/community/discussions/24375
          const pendingReviewPulls = pulls.filter(
            ({ reviewDecision, user }) =>
              (reviewDecision === ReviewDecision.REVIEW_REQUIRED || reviewDecision === null) && user?.login === login
          );
          const reviewRequestedPulls = pulls.filter(({ user }) => user?.login !== login);

          return (
            <MenuBarExtra.Section title={owner ?? "Unknown"} key={owner}>
              <MenuBarExtra.Submenu
                title={`Wait For Merge${approvedPulls.length ? ` (${approvedPulls.length})` : ""}`}
                icon={approvedPulls.length > 0 ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Checkmark}
              >
                {approvedPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`Wait For Change${changeRequestedPulls.length ? ` (${changeRequestedPulls.length})` : ""}`}
                icon={changeRequestedPulls.length > 0 ? { source: Icon.Bug, tintColor: Color.Red } : Icon.Bug}
              >
                {changeRequestedPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`Wait For Review${pendingReviewPulls.length ? ` (${pendingReviewPulls.length})` : ""}`}
                icon={
                  pendingReviewPulls.length > 0 ? { source: Icon.Hourglass, tintColor: Color.Yellow } : Icon.Hourglass
                }
              >
                {pendingReviewPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`New Review Request${reviewRequestedPulls.length ? ` (${reviewRequestedPulls.length})` : ""}`}
                icon={reviewRequestedPulls.length > 0 ? { source: Icon.Bell, tintColor: Color.Purple } : Icon.Bell}
              >
                {reviewRequestedPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
            </MenuBarExtra.Section>
          );
        })}
      </>

      {isReady && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Force Refresh"
            onAction={runPullIteration}
            icon={Icon.RotateClockwise}
            shortcut={{ key: "r", modifiers: ["cmd"] }}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
};

// noinspection JSUnusedGlobalSymbols
export default actionablePullRequests;
