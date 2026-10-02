import { MenuSettings } from "./attention/components/menu-settings";
import { MenuBarExtra, open, Icon, Color, launchCommand, LaunchType } from "@raycast/api";
import { useMemo } from "react";
import usePulls from "./hooks/usePulls";
import { groupPullsByOwner } from "./util";
import { ReviewDecision } from "./types";
import PullRequestItem from "./components/PullRequestItem";

const actionablePullRequests = () => {
  const { isLoading, isReady, login, openPulls, recentlyVisitedPulls, scopeOwners, visitPull, runPullIteration } =
    usePulls();

  const title = useMemo(() => (openPulls.length > 0 ? `${openPulls.length}` : "🎉"), [openPulls]);

  const ownerGroups = useMemo(() => groupPullsByOwner(scopeOwners, openPulls), [scopeOwners, openPulls]);

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
        {ownerGroups.map(({ owner, pulls }) => {
          const approvedPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.APPROVED && user?.login === login,
          );
          const changeRequestedPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.CHANGES_REQUESTED && user?.login === login,
          );
          // NOTE: both the `REVIEW_REQUIRED` and `null` statuses indicate that the PR is waiting for a review.
          // Refer to: https://github.com/orgs/community/discussions/24375
          const pendingReviewPulls = pulls.filter(
            ({ reviewDecision, user }) =>
              (reviewDecision === ReviewDecision.REVIEW_REQUIRED || reviewDecision === null) && user?.login === login,
          );
          // Anything the scope sweep alone turned up is not a review request,
          // so it gets its own group and the original four keep their exact
          // meaning.
          const reviewRequestedPulls = pulls.filter(
            ({ user, inWatchedScope }) => user?.login !== login && !inWatchedScope,
          );
          const inScopePulls = pulls.filter(({ user, inWatchedScope }) => user?.login !== login && inWatchedScope);

          return (
            <MenuBarExtra.Section title={owner} key={owner}>
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
              {/*
                Rendered whether or not it has anything, like the four above:
                a submenu that comes and goes with a background refresh moves
                everything under it while the menu is open, and a click already
                on its way lands on the wrong row.
              */}
              <MenuBarExtra.Submenu
                title={`Other Open PRs${inScopePulls.length ? ` (${inScopePulls.length})` : ""}`}
                icon={inScopePulls.length > 0 ? { source: Icon.Binoculars, tintColor: Color.Blue } : Icon.Binoculars}
              >
                {inScopePulls.map((pull, index) => (
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

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Pull Request Attention"
          icon={Icon.Message}
          onAction={() => launchCommand({ name: "pull-requests", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Activity Inbox"
          icon={Icon.Tray}
          onAction={() => launchCommand({ name: "activity", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      <MenuSettings />
      {isReady && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Force Refresh"
            onAction={() => runPullIteration()}
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
