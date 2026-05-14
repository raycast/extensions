import { ActionPanel, Action, List, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fetchRuns, dagsterRunUrl } from "./api";
import { formatTimestamp, formatDuration, statusIcon, statusColor } from "./helpers";
import RunAssets from "./components/RunAssets";
import RunErrors from "./components/RunErrors";

const STATUS_FILTERS = ["All", "SUCCESS", "FAILURE", "STARTED", "QUEUED", "CANCELED"] as const;

export default function ListRuns() {
  const { data: runs, isLoading, revalidate } = useCachedPromise(fetchRuns);
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = statusFilter === "All" ? runs : runs?.filter((r) => r.status === statusFilter);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter runs..."
      searchBarAccessory={
        <List.Dropdown tooltip="Status" value={statusFilter} onChange={setStatusFilter}>
          {STATUS_FILTERS.map((s) => (
            <List.Dropdown.Item
              key={s}
              title={s === "All" ? "All Statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
              value={s}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Runs" description="No runs match the selected filter." />
      {filtered?.map((run) => {
        const duration = run.startTime && run.endTime ? run.endTime - run.startTime : null;
        return (
          <List.Item
            key={run.id}
            icon={{ source: statusIcon(run.status), tintColor: statusColor(run.status) }}
            title={run.jobName}
            subtitle={formatTimestamp(run.startTime)}
            accessories={[{ text: formatDuration(duration) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Assets"
                  icon={Icon.Layers}
                  target={<RunAssets runId={run.id} jobName={run.jobName} />}
                />
                <Action.Push
                  title="View Errors"
                  icon={Icon.ExclamationMark}
                  target={<RunErrors runId={run.id} jobName={run.jobName} />}
                />
                <Action.OpenInBrowser
                  title="Open in Dagster"
                  url={dagsterRunUrl(run.id)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={dagsterRunUrl(run.id)}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
