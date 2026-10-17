import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { formatBytes, formatDuration } from "../lib/format";
import { readCleanupHistory } from "../storage";
import type { CleanupHistoryItem, CleanupRun } from "../types";
import { cleanupMethodLabel, providerIcon } from "./CandidateDetail";

type CleanupStatus = CleanupHistoryItem["status"];

function summarizeRun(run: CleanupRun) {
  return {
    cleaned: run.items.filter((item) => item.status === "cleaned").length,
    failed: run.items.filter((item) => item.status === "failed").length,
    cancelled: run.items.filter((item) => item.status === "cancelled").length,
    reclaimed: run.items.reduce((sum, item) => sum + (item.bytesReclaimed ?? 0), 0),
  };
}

function statusLabel(status: CleanupStatus): string {
  return status === "cleaned" ? "Cleaned" : status === "failed" ? "Failed" : "Cancelled";
}

function statusIcon(status: CleanupStatus) {
  return {
    source: status === "cleaned" ? Icon.CheckCircle : status === "failed" ? Icon.XMarkCircle : Icon.Stop,
    tintColor: statusColor(status),
  };
}

function statusColor(status: CleanupStatus): Color {
  return status === "cleaned" ? Color.Green : status === "failed" ? Color.Red : Color.Orange;
}

function reportText(run: CleanupRun): string {
  const summary = summarizeRun(run);
  return [
    `# Cleanup Report`,
    "",
    `Started: ${new Date(run.startedAt).toLocaleString()}`,
    `Completed: ${new Date(run.completedAt).toLocaleString()}`,
    `Succeeded: ${summary.cleaned}`,
    `Failed: ${summary.failed}`,
    `Cancelled: ${summary.cancelled}`,
    `Measured disk space reclaimed: ${formatBytes(summary.reclaimed)}`,
    "",
    ...run.items.map(
      (item) =>
        `- ${item.status === "cleaned" ? "✓" : item.status === "cancelled" ? "–" : "✗"} ${item.title} (${item.providerId}, footprint ${formatBytes(item.bytes)}, reclaimed ${formatBytes(item.bytesReclaimed)}): ${item.message ?? "No details"}`,
    ),
  ].join("\n");
}

function ResultDetail({ item }: { item: CleanupHistoryItem }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={statusLabel(item.status)}
              icon={statusIcon(item.status).source}
              color={statusColor(item.status)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={item.providerId}
            icon={providerIcon(item.providerId, Icon.Box)}
          />
          <List.Item.Detail.Metadata.Label title="Cleanup" text={cleanupMethodLabel(item.cleanupPolicy)} />
          <List.Item.Detail.Metadata.Label title="Footprint" text={formatBytes(item.bytes)} />
          <List.Item.Detail.Metadata.Label title="Reclaimed" text={formatBytes(item.bytesReclaimed)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Message" text={item.message ?? "No details"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function RunDetail({ run }: { run: CleanupRun }) {
  const summary = summarizeRun(run);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Started" text={new Date(run.startedAt).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Completed" text={new Date(run.completedAt).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(run.startedAt, run.completedAt)} />
          <List.Item.Detail.Metadata.Label title="Items" text={String(run.items.length)} />
          <List.Item.Detail.Metadata.TagList title="Results">
            {summary.cleaned > 0 ? (
              <List.Item.Detail.Metadata.TagList.Item text={`${summary.cleaned} cleaned`} color={Color.Green} />
            ) : null}
            {summary.failed > 0 ? (
              <List.Item.Detail.Metadata.TagList.Item text={`${summary.failed} failed`} color={Color.Red} />
            ) : null}
            {summary.cancelled > 0 ? (
              <List.Item.Detail.Metadata.TagList.Item text={`${summary.cancelled} cancelled`} color={Color.Orange} />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Reclaimed" text={formatBytes(summary.reclaimed)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function CleanupReport({ run, onRetry }: { run: CleanupRun; onRetry?: () => void }) {
  const groups = useMemo(
    () => ({
      cleaned: run.items.filter((item) => item.status === "cleaned"),
      failed: run.items.filter((item) => item.status === "failed"),
      cancelled: run.items.filter((item) => item.status === "cancelled"),
    }),
    [run],
  );
  const report = reportText(run);

  return (
    <List isShowingDetail navigationTitle="Cleanup Report" searchBarPlaceholder="Search cleanup results">
      <List.EmptyView title="No cleanup results" />
      {(["failed", "cancelled", "cleaned"] as const).map((status) =>
        groups[status].length > 0 ? (
          <List.Section key={status} title={statusLabel(status)} subtitle={String(groups[status].length)}>
            {groups[status].map((item) => (
              <List.Item
                key={item.candidateId}
                title={item.title}
                icon={statusIcon(status)}
                keywords={[item.providerId, item.message ?? ""]}
                accessories={[
                  {
                    icon: item.cleanupPolicy === "command" ? Icon.Terminal : Icon.Trash,
                    tooltip: `${formatBytes(item.bytesReclaimed)} reclaimed`,
                  },
                ]}
                detail={<ResultDetail item={item} />}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Result"
                      content={`${item.title}: ${item.message ?? item.status}`}
                    />
                    <Action.CopyToClipboard title="Copy Full Report" content={report} />
                    <Action.CopyToClipboard title="Export Report as JSON" content={JSON.stringify(run, null, 2)} />
                    {status === "failed" && onRetry ? (
                      <Action title="Retry Failed Items" icon={Icon.ArrowClockwise} onAction={onRetry} />
                    ) : null}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export function CleanupHistory() {
  const [history, setHistory] = useState<CleanupRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    readCleanupHistory()
      .then((runs) => {
        if (active) setHistory(runs);
      })
      .catch(async (error) => {
        if (active)
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not load cleanup history",
            message: (error as Error).message,
          });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Cleanup History">
      <List.EmptyView
        icon={Icon.Clock}
        title="No Cleanup History"
        description="Completed cleanup runs will appear here."
      />
      {history.length > 0 ? (
        <List.Section title="Runs" subtitle={String(history.length)}>
          {history.map((run) => {
            const failures = run.items.filter((item) => item.status === "failed").length;
            return (
              <List.Item
                key={run.id}
                title={new Date(run.completedAt).toLocaleString()}
                icon={{
                  source: failures > 0 ? Icon.Warning : Icon.CheckCircle,
                  tintColor: failures > 0 ? Color.Orange : Color.Green,
                }}
                accessories={[
                  {
                    icon: failures > 0 ? { source: Icon.XMarkCircle, tintColor: Color.Red } : Icon.Check,
                    tooltip: failures > 0 ? `${failures} failed` : "Completed",
                  },
                ]}
                detail={<RunDetail run={run} />}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Cleanup Report" icon={Icon.List} target={<CleanupReport run={run} />} />
                    <Action.CopyToClipboard title="Copy Full Report" content={reportText(run)} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
