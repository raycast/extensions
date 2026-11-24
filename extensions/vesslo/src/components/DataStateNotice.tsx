import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import {
  assessUpdateCount,
  reviewSnapshotReason,
  VessloDataState,
} from "../utils/data-state";
import { openInVesslo } from "../utils/actions";
import { displayText, markdownText } from "../utils/display-format";
import { readyHomebrewTargetCount } from "../utils/homebrew-readiness";

const labels: Record<VessloDataState["status"], string> = {
  loading: "Loading Vesslo Data",
  ready: "Vesslo Data Ready",
  stale: "Refresh Vesslo Data",
  missing: "Vesslo Data Missing",
  malformed: "Invalid Vesslo Data",
  permissionDenied: "Cannot Read Vesslo Data",
  ioError: "Cannot Read Vesslo Data",
  contractMismatch: "Update Count Mismatch",
};

export function ReloadDataAction({
  refresh,
}: {
  refresh: () => unknown | Promise<unknown>;
}) {
  return (
    <Action
      title="Reload Vesslo Data"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        await refresh();
      }}
    />
  );
}

export function DataStateNotice({
  state,
  refresh,
}: {
  state: VessloDataState;
  refresh: () => unknown | Promise<unknown>;
}) {
  const countAssessment =
    state.updateCountAssessment ??
    (state.data ? assessUpdateCount(state.data) : null);
  const countUnverified =
    state.status === "ready" && countAssessment?.status === "unverifiable";
  const snapshotReason = state.data
    ? reviewSnapshotReason(state.data, state.checkedAt || Date.now())
    : null;
  const homebrewReadyCount =
    state.status === "ready" &&
    countAssessment?.status === "consistent" &&
    state.data?.schemaVersion === 3
      ? (state.homebrewReadyTargetCount ??
        readyHomebrewTargetCount(state.data, state.checkedAt || Date.now()))
      : 0;
  const reason =
    (countUnverified
      ? countAssessment?.reason
      : (state.reason ?? snapshotReason)) ??
    "Waiting for the exported app list";
  if (state.status === "ready" && !countUnverified && !snapshotReason)
    return null;
  const title = countUnverified
    ? "Update Count Unverified"
    : state.status === "ready" && snapshotReason
      ? state.data?.checkPhase === "checking"
        ? "Checking for Updates"
        : state.data?.checkPhase === "failed"
          ? "Full Update Check Failed"
          : "Update Check Required"
      : labels[state.status];
  const readinessExplanation =
    homebrewReadyCount > 0
      ? `${homebrewReadyCount} target${homebrewReadyCount === 1 ? " has" : "s have"} current Homebrew source evidence and can be reviewed in Vesslo. This count is separate from the total candidate count. Other update routes remain blocked until the full-inventory check is ready.`
      : "This snapshot is for review only. Refresh in Vesslo before requesting an update.";
  const details = `### ${title}\n\n${markdownText(reason, 1600)}\n\n${readinessExplanation}`;
  return (
    <List.Section title={state.data ? "Check status" : "Data status"}>
      <List.Item
        id="vesslo-data-status"
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title={title}
        subtitle={displayText(
          homebrewReadyCount > 0
            ? "Other update routes are blocked"
            : state.status === "ready" && snapshotReason && !countUnverified
              ? state.data?.checkPhase === "checking"
                ? "Wait for Vesslo to finish checking"
                : "Run a fresh check in Vesslo"
              : reason,
        )}
        accessories={
          state.data
            ? [
                {
                  text:
                    homebrewReadyCount > 0
                      ? `${homebrewReadyCount} Homebrew ready`
                      : "Review only",
                  tooltip: `${displayText(reason, 640)}\n${readinessExplanation}`,
                },
              ]
            : []
        }
        actions={
          <ActionPanel>
            <Action
              title="Open Vesslo"
              icon={Icon.AppWindow}
              onAction={() => openInVesslo()}
            />
            <Action.Push
              title="View Check Details"
              icon={Icon.Info}
              target={
                <Detail
                  navigationTitle="Vesslo Check Status"
                  markdown={details}
                />
              }
            />
            <ReloadDataAction refresh={refresh} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
