import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  findRun,
  getRunLogs,
  NtnError,
  type Run,
  type Worker,
} from "../lib/ntn";
import { formatDateTime, parseRunName } from "../lib/format";

const POLL_INTERVAL_MS = 3000;

export default function LogsView({
  worker,
  run: initialRun,
}: {
  worker: Worker;
  run: Run;
}) {
  const [run, setRun] = useState<Run>(initialRun);
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const cancelledRef = useRef(false);

  async function fetchOnce(): Promise<{ logs: string; run: Run | null }> {
    const [logsResult, latestRun] = await Promise.all([
      getRunLogs(worker.workerId, run.runId).catch(() => null),
      findRun(worker.workerId, run.runId).catch(() => null),
    ]);
    return { logs: logsResult?.logs ?? "", run: latestRun };
  }

  async function load() {
    setIsLoading(true);
    try {
      const { logs: newLogs, run: latest } = await fetchOnce();
      setLogs(newLogs);
      if (latest) setRun(latest);
    } catch (err) {
      const message = err instanceof NtnError ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load logs",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (run.endedAt) return;
    cancelledRef.current = false;
    setIsPolling(true);

    let timeout: NodeJS.Timeout | null = null;
    const tick = async () => {
      if (cancelledRef.current) return;
      try {
        const { logs: newLogs, run: latest } = await fetchOnce();
        if (cancelledRef.current) return;
        if (newLogs) setLogs(newLogs);
        if (latest) {
          setRun(latest);
          if (latest.endedAt) {
            setIsPolling(false);
            return;
          }
        }
      } catch {
        // swallow polling errors; user can refresh manually
      }
      if (!cancelledRef.current) {
        timeout = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    timeout = setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (timeout) clearTimeout(timeout);
      setIsPolling(false);
    };
  }, [run.endedAt, run.runId, worker.workerId]);

  const { key } = parseRunName(run.name);
  const stateLabel = !run.endedAt
    ? "Running"
    : run.exitCode === 0
      ? "Success"
      : "Failed";
  const stateColor = !run.endedAt
    ? Color.Blue
    : run.exitCode === 0
      ? Color.Green
      : Color.Red;
  const liveSuffix = isPolling ? "  _(live, refreshing every 3s)_" : "";
  const markdown = logs
    ? "```\n" + logs + "\n```" + liveSuffix
    : isLoading
      ? "Loading logs..."
      : isPolling
        ? "_Waiting for output..._" + liveSuffix
        : "_No logs available._";

  return (
    <Detail
      isLoading={isLoading || isPolling}
      navigationTitle={`Logs · ${key}`}
      markdown={markdown}
      metadata={
        showMetadata ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Worker" text={worker.name} />
            <Detail.Metadata.Label title="Capability" text={key} />
            <Detail.Metadata.Label title="Run ID" text={run.runId} />
            <Detail.Metadata.TagList title="State">
              <Detail.Metadata.TagList.Item
                text={stateLabel}
                color={stateColor}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="Started"
              text={formatDateTime(run.startedAt)}
            />
            {run.endedAt ? (
              <Detail.Metadata.Label
                title="Ended"
                text={formatDateTime(run.endedAt)}
              />
            ) : null}
            {run.exitCode !== null ? (
              <Detail.Metadata.Label
                title="Exit Code"
                text={String(run.exitCode)}
              />
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={showMetadata ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            onAction={() => setShowMetadata((v) => !v)}
          />
          <Action.CopyToClipboard title="Copy Logs" content={logs} />
          <Action.CopyToClipboard title="Copy Run ID" content={run.runId} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={load}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
