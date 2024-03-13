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
  const { isLoading, isReady, login, updatedPulls, recentlyVisitedPulls, visitPull, runPullIteration } = usePulls();

  const title = useMemo(() => (updatedPulls.length > 0 ? `${updatedPulls.length}` : "🎉"), [updatedPulls]);

  const pullsByOwner = useMemo(
    () => groupedByAttribute(updatedPulls, "owner.login") as PullRequestGroup,
    [updatedPulls]
  );

  return (
    <MenuBarExtra isLoading={isLoading} icon="icon.png" title={title} tooltip="Your Pull Requests">
      {updatedPulls.length === 0 && (
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

          // Pulls
          const wfmPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.APPROVED && user?.login === login
          );
          const wfcPulls = pulls.filter(
            ({ reviewDecision, user }) => reviewDecision === ReviewDecision.CHANGES_REQUESTED && user?.login === login
          );
          const wfrPulls = pulls.filter(({ reviewDecision, user }) => reviewDecision === null && user?.login === login);
          const nrrPulls = pulls.filter(({ user }) => user?.login !== login);

          // Icons
          const wfmIcon = wfmPulls.length > 0 ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Checkmark;
          const wfcIcon = wfcPulls.length > 0 ? { source: Icon.Bug, tintColor: Color.Red } : Icon.Bug;
          const wfrIcon = wfrPulls.length > 0 ? { source: Icon.Hourglass, tintColor: Color.Yellow } : Icon.Hourglass;
          const nrrIcon = nrrPulls.length > 0 ? { source: Icon.Bell, tintColor: Color.Purple } : Icon.Bell;

          return (
            <MenuBarExtra.Section title={owner ?? "Unknown"} key={owner}>
              <MenuBarExtra.Submenu
                title={`Wait For Merge${wfmPulls.length ? ` (${wfmPulls.length})` : ""}`}
                icon={wfmIcon}
              >
                {wfmPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`Wait For Change${wfcPulls.length ? ` (${wfcPulls.length})` : ""}`}
                icon={wfcIcon}
              >
                {wfcPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`Wait For Review${wfrPulls.length ? ` (${wfrPulls.length})` : ""}`}
                icon={wfrIcon}
              >
                {wfrPulls.map((pull, index) => (
                  <PullRequestItem
                    key={pull.id}
                    pull={pull}
                    index={index}
                    onAction={() => open(pull.url).then(() => visitPull(pull))}
                  />
                ))}
              </MenuBarExtra.Submenu>
              <MenuBarExtra.Submenu
                title={`New Review Request${nrrPulls.length ? ` (${nrrPulls.length})` : ""}`}
                icon={nrrIcon}
              >
                {nrrPulls.map((pull, index) => (
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
