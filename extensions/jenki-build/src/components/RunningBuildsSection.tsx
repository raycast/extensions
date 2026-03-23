import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { BuildHistoryEntry, JobStatus } from "../types";
import { fetchBuildStatus, BuildStatus } from "../api/jenkins";
import { progressBar, formatDuration } from "../utils/build";
import { getStatusIcon } from "../utils/status";
import { buildUrl, reconstructJob } from "../build-history";
import { BuildStatusView } from "./BuildStatusView";
import { BuildParamForm } from "./BuildParamForm";

export function RunningBuildsSection({
  entries,
}: {
  entries: BuildHistoryEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <List.Section title="Running Builds">
      {entries.map((entry) => (
        <RunningBuildItem
          key={`${entry.jobPath}-${entry.triggeredAt}`}
          entry={entry}
        />
      ))}
    </List.Section>
  );
}

function RunningBuildItem({ entry }: { entry: BuildHistoryEntry }) {
  const { push } = useNavigation();
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const bUrl = buildUrl(entry.jobUrl, entry.buildNumber);

  async function refresh() {
    if (entry.buildNumber === 0) return;
    const url = entry.jobUrl.replace(/\/$/, "") + "/" + entry.buildNumber + "/";
    try {
      const s = await fetchBuildStatus(url);
      setStatus(s);
    } catch {
      // Keep last known status on error, do not crash
    }
  }

  // Poll every 3s while building or no status yet
  useEffect(() => {
    if (entry.buildNumber === 0) return;
    refresh();
    if (status !== null && status.building === false) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [status?.building]);

  // Tick elapsed time every second while building
  useEffect(() => {
    if (!status?.building) return;
    const start = status.timestamp + status.duration;
    const tick = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(tick);
  }, [status?.building, status?.timestamp]);

  // Derive icon
  function getIcon() {
    if (status && !status.building) {
      const derivedStatus: JobStatus =
        status.result === "SUCCESS"
          ? "success"
          : status.result === "FAILURE"
            ? "failure"
            : status.result === "ABORTED"
              ? "aborted"
              : entry.status;
      return getStatusIcon(derivedStatus);
    }
    if (status?.building) {
      return { source: Icon.CircleProgress };
    }
    return getStatusIcon(entry.status);
  }

  // Compute accessories
  function getAccessories(): List.Item.Accessory[] {
    if (entry.buildNumber === 0) {
      return [{ text: "Queued" }];
    }
    if (!status) {
      return [];
    }
    if (status.building) {
      const totalMs = elapsed + status.duration;
      const pct =
        status.estimatedDuration > 0
          ? Math.min(
              100,
              Math.round((totalMs / status.estimatedDuration) * 100),
            )
          : 0;
      return [
        { text: progressBar(pct) + " " + pct + "%" },
        {
          text:
            formatDuration(totalMs) +
            "/" +
            formatDuration(status.estimatedDuration),
        },
      ];
    }
    // Finished
    const label =
      status.result === "SUCCESS"
        ? "OK"
        : status.result === "FAILURE"
          ? "FAIL"
          : status.result === "ABORTED"
            ? "Aborted"
            : (status.result ?? "Done");
    return [{ text: label }, { text: formatDuration(status.duration) }];
  }

  return (
    <List.Item
      title={entry.jobName}
      subtitle={entry.buildNumber === 0 ? "#queued" : `#${entry.buildNumber}`}
      icon={getIcon()}
      accessories={getAccessories()}
      actions={
        <ActionPanel>
          <Action
            title="View Status"
            icon={Icon.Eye}
            onAction={() =>
              push(
                <BuildStatusView
                  jobName={entry.jobName}
                  jobPath={entry.jobPath}
                  jobUrl={entry.jobUrl}
                  buildNumber={entry.buildNumber}
                />,
              )
            }
          />
          {bUrl && <Action.OpenInBrowser title="Open in Browser" url={bUrl} />}
          {bUrl && (
            <Action.CopyToClipboard title="Copy Build URL" content={bUrl} />
          )}
          <Action
            title="Re-trigger"
            icon={Icon.Play}
            onAction={() =>
              push(<BuildParamForm job={reconstructJob(entry)} />)
            }
          />
        </ActionPanel>
      }
    />
  );
}
