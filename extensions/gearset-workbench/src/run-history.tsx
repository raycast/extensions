import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { GearsetClient } from "./api";
import { stateColor, stateIcon } from "./format";
import { requireApiToken } from "./preferences";
import { clearRunHistory, getRunHistory, updateRunHistory } from "./storage";
import { RunHistoryEntry } from "./types";

export default function RunHistory() {
  const [entries, setEntries] = useState<RunHistoryEntry[]>([]);
  const [isLoading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setEntries(await getRunHistory());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async (entry: RunHistoryEntry) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing Gearset run…" });
    try {
      const status = await new GearsetClient(requireApiToken("automation")).getCiRunStatus(
        entry.jobId,
        entry.runRequestId,
      );
      await updateRunHistory(entry.id, status);
      toast.style = Toast.Style.Success;
      toast.title = `Run is ${status.State}`;
      await load();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not refresh the run";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  const clear = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Gearset run history?",
      message: "This removes the local list of CI runs requested through Raycast.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearRunHistory();
    await load();
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={entries.length > 0}
      searchBarPlaceholder="Search Raycast-requested Gearset runs…"
    >
      {entries.map((entry) => {
        const detail = `# ${entry.jobName}\n\n| Property | Value |\n| --- | --- |\n| Environment | ${entry.environment.toUpperCase()} |\n| State | ${entry.state} |\n| Requested | ${new Date(entry.timestamp).toLocaleString()} |\n| Job ID | ${entry.jobId} |\n| Run request ID | ${entry.runRequestId} |\n| Gearset run ID | ${entry.runId ?? "Pending"} |\n| Started | ${entry.startDateTime ? new Date(entry.startDateTime).toLocaleString() : "Pending"} |\n| Ended | ${entry.endDateTime ? new Date(entry.endDateTime).toLocaleString() : "Pending"} |\n| Commit override | ${entry.sourceGitCommitId ?? "None"} |`;
        return (
          <List.Item
            key={entry.id}
            icon={{ source: stateIcon(entry.state), tintColor: stateColor(entry.state) }}
            title={entry.jobName}
            subtitle={entry.runRequestId}
            accessories={[
              {
                tag: {
                  value: entry.environment === "production" ? "PRODUCTION" : entry.state,
                  color: entry.environment === "production" ? Color.Red : stateColor(entry.state),
                },
              },
              { date: new Date(entry.timestamp) },
            ]}
            detail={<List.Item.Detail markdown={detail} />}
            actions={
              <ActionPanel>
                <Action title="Refresh Run Status" icon={Icon.ArrowClockwise} onAction={() => refresh(entry)} />
                <Action.CopyToClipboard title="Copy Run Request ID" content={entry.runRequestId} />
                {entry.runId ? <Action.CopyToClipboard title="Copy Gearset Run ID" content={entry.runId} /> : null}
                <Action.OpenInBrowser
                  title="Open Gearset CI Dashboard"
                  url="https://app.gearset.com/continuous-integration"
                />
                <Action title="Clear Run History" icon={Icon.Trash} style={Action.Style.Destructive} onAction={clear} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && !entries.length ? (
        <List.EmptyView
          title="No Gearset runs requested from Raycast"
          description="Request a run from Gearset CI Jobs."
        />
      ) : null}
    </List>
  );
}
