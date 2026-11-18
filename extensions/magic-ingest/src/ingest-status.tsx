import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  launchCommand,
  LaunchType,
  confirmAlert,
  Alert,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { JobState, listJobs, isJobRunning } from "./utils/jobs";
import { LOG_FILE } from "./utils/constants";
import { STAGE_LABELS, progressBar, formatElapsed } from "./utils/format";
import { IngestStatusView } from "./components/ingest-status-view";

/** Running flag from last refresh — avoids re-calling isJobRunning during render. */
type JobRow = JobState & { _running: boolean };

function summarize(job: JobState): { title: string; subtitle: string } {
  const stage = STAGE_LABELS[job.stage] ?? job.stage;
  const { current, total } = job.progress;
  const bar = total > 0 ? progressBar(current, total) : "";
  const pct = total > 0 ? ` ${Math.round((current / total) * 100)}%` : "";
  const subtitle = `${stage}  ${bar}${pct}`.trim();
  return { title: job.folderName || job.jobId, subtitle };
}

export default function Command() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastSnapshotRef = useRef("");

  const refresh = useCallback(async () => {
    const all = await listJobs();
    // Sort: running first, then newest-first within each group.
    // Compute running status once per job to avoid double syscall.
    const withStatus = all.map((job) => ({ job, running: isJobRunning(job) }));
    withStatus.sort((a, b) => {
      if (a.running !== b.running) return a.running ? -1 : 1;
      return b.job.startedAt.localeCompare(a.job.startedAt);
    });
    const sorted: JobRow[] = withStatus.map(({ job, running }) => ({
      ...job,
      _running: running,
    }));

    // Skip re-render when nothing changed
    const snapshot = JSON.stringify(sorted);
    if (snapshot !== lastSnapshotRef.current) {
      lastSnapshotRef.current = snapshot;
      setJobs(sorted);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
  }, [refresh]);

  const stopJob = useCallback(
    async (job: JobRow) => {
      const ok = await confirmAlert({
        title: `Stop "${job.folderName}"?`,
        message: "Files already copied will remain in the destination folder.",
        primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
      try {
        process.kill(job.pid, "SIGTERM");
        await showHUD("🛑 Ingest stopped");
        setTimeout(refresh, 500);
      } catch {
        await showHUD("Could not stop process");
      }
    },
    [refresh],
  );

  const startNew = useCallback(async () => {
    try {
      await launchCommand({ name: "ingest", type: LaunchType.UserInitiated });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open Magic Ingest",
        message: String(err),
      });
    }
  }, []);

  const running: JobRow[] = [];
  const finished: JobRow[] = [];
  for (const job of jobs) {
    (job._running ? running : finished).push(job);
  }

  const globalActions = (
    <>
      <Action
        title="Start New Ingest"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={startNew}
      />
      <Action.Open
        title="Open Log"
        target={LOG_FILE}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
    </>
  );

  if (!isLoading && jobs.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Camera}
          title="No Ingests Running"
          description="Start one from Magic Ingest"
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Ingest Jobs">
      {running.length > 0 && (
        <List.Section title={`Running (${running.length})`}>
          {running.map((job) => {
            const { title, subtitle } = summarize(job);
            const elapsed = formatElapsed(new Date(job.startedAt));
            return (
              <List.Item
                key={job.jobId}
                icon={{ source: Icon.Camera, tintColor: Color.Purple }}
                title={title}
                subtitle={subtitle}
                accessories={[{ text: elapsed, icon: Icon.Clock }]}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Details" icon={Icon.Eye} target={<IngestStatusView jobId={job.jobId} />} />
                    <Action
                      title="Stop Ingest"
                      icon={Icon.Stop}
                      style={Action.Style.Destructive}
                      onAction={() => stopJob(job)}
                    />
                    <Action.ShowInFinder title="Show Destination" path={job.destDir} />
                    {globalActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {finished.length > 0 && (
        <List.Section title="Finished">
          {finished.map((job) => {
            const { title } = summarize(job);
            const hasError = Boolean(job.error);
            return (
              <List.Item
                key={job.jobId}
                icon={{
                  source: hasError ? Icon.ExclamationMark : Icon.CheckCircle,
                  tintColor: hasError ? Color.Red : Color.Green,
                }}
                title={title}
                subtitle={hasError ? (job.error ?? "Finished with errors") : "Complete"}
                accessories={[
                  {
                    text: formatElapsed(new Date(job.startedAt)),
                    icon: Icon.Clock,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Details" icon={Icon.Eye} target={<IngestStatusView jobId={job.jobId} />} />
                    <Action.ShowInFinder title="Show Destination" path={job.destDir} />
                    {globalActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
