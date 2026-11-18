import { Action, ActionPanel, Color, Grid, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import type { ListRecordingsFilters, RecordingSortField, RecordingsQuery, SortDirection } from "./api/types";
import { CommonActions } from "./components/common-actions";
import { useRecordings } from "./hooks/use-recordings";
import { useWorkspaces } from "./hooks/use-workspaces";
import { DEFAULT_FILTERS, FiltersScreen } from "./list-recordings-filters";
import { dashRecordingPlaybackUrl, dashRecordingsUrl } from "./utils/dash-urls";
import { formatDuration, formatRelativeTime, isExpiringSoon } from "./utils/format";

const LAST_WORKSPACE_KEY = "userplane:lastWorkspaceId";

function isFiltered(filters: ListRecordingsFilters): boolean {
  return (
    filters.projectIds.length > 0 ||
    filters.linkIds.length > 0 ||
    filters.creatorIds.length > 0 ||
    filters.sortBy !== "created_at" ||
    filters.sortDirection !== "desc"
  );
}

function buildQueryFromFilters(filters: ListRecordingsFilters): RecordingsQuery {
  const query: RecordingsQuery = {
    sort_by: filters.sortBy,
    sort_direction: filters.sortDirection,
  };
  if (filters.creatorIds.length > 0) query.created_by = filters.creatorIds;
  if (filters.projectIds.length > 0) query.project_id = filters.projectIds;
  if (filters.linkIds.length > 0) query.link_id = filters.linkIds;
  return query;
}

export default function ListRecordingsCommand() {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [bootstrapped, setBootstrapped] = useState(false);

  const workspaces = useWorkspaces();

  useEffect(() => {
    void (async () => {
      const stored = await LocalStorage.getItem<string>(LAST_WORKSPACE_KEY);
      if (stored) setWorkspaceId(stored);
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    const list = workspaces.data?.workspaces;
    if (!list || list.length === 0 || !bootstrapped) return;
    if (workspaceId && list.some((w) => w.workspaceId === workspaceId)) return;
    setWorkspaceId(list[0].workspaceId);
  }, [workspaces.data, workspaceId, bootstrapped]);

  useEffect(() => {
    if (workspaceId) void LocalStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  }, [workspaceId]);

  const currentWorkspace = workspaces.data?.workspaces.find((w) => w.workspaceId === workspaceId);
  const currentMemberId = currentWorkspace?.workspaceMembership?.workspaceMemberId;

  const filterCacheKey = workspaceId ? `list-recordings:filters:${workspaceId}` : "list-recordings:filters:none";
  const [filters, setFilters] = useCachedState<ListRecordingsFilters>(filterCacheKey, DEFAULT_FILTERS);

  const query = useMemo(() => buildQueryFromFilters(filters), [filters]);

  const recordingsWorkspaceId = bootstrapped && !workspaces.isLoading && workspaceId ? workspaceId : undefined;
  const recordings = useRecordings(recordingsWorkspaceId, query);

  const items = recordings.data;
  const isLoading = workspaces.isLoading || recordings.isLoading;
  const workspaceList = workspaces.data?.workspaces ?? [];
  const dashboardAllUrl = dashRecordingsUrl({
    workspaceId: workspaceId || undefined,
    creators: filters.creatorIds.length > 0 ? filters.creatorIds : undefined,
  });

  function setSort(sortBy: RecordingSortField, sortDirection: SortDirection) {
    setFilters({ ...filters, sortBy, sortDirection });
  }

  function clearFilters() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  async function notifyCopied() {
    await showToast({ style: Toast.Style.Success, title: "URL copied" });
  }

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      inset={Grid.Inset.Small}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      filtering={false}
    >
      <Grid.EmptyView
        icon={Icon.Video}
        title={isLoading ? "Loading recordings…" : "No recordings"}
        description={
          isLoading
            ? undefined
            : isFiltered(filters)
              ? "No recordings match these filters. Clear them to see everything."
              : "You don't have any recordings in this workspace yet. Share a recording link to start capturing sessions."
        }
        actions={
          <ActionPanel>
            {workspaceId ? (
              <Action.Push
                title="Filter & Sort…"
                icon={Icon.Filter}
                target={
                  <FiltersScreen
                    workspaceId={workspaceId}
                    value={filters}
                    currentMemberId={currentMemberId}
                    onChange={setFilters}
                  />
                }
              />
            ) : null}
            <Action title="Clear Filters" icon={Icon.XMarkCircle} onAction={clearFilters} />
            <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
          </ActionPanel>
        }
      />
      {items.map((recording) => {
        const playbackUrl = workspaceId ? dashRecordingPlaybackUrl(workspaceId, recording.recordingId) : "";
        const durationLabel = formatDuration(recording.recordingDurationMs);
        const createdLabel = formatRelativeTime(recording.createdAt);
        const subtitle = `${recording.creator.name} · ${durationLabel}${createdLabel ? ` · ${createdLabel}` : ""}`;
        return (
          <Grid.Item
            key={recording.recordingId}
            content={
              recording.recordingThumbnail
                ? { source: recording.recordingThumbnail }
                : { source: Icon.Video, tintColor: Color.SecondaryText }
            }
            title={recording.linkTitle || "Untitled recording"}
            subtitle={subtitle}
            accessory={
              isExpiringSoon(recording.expiresAt)
                ? {
                    icon: { source: Icon.Clock, tintColor: Color.Orange },
                    tooltip: "Expiring soon",
                  }
                : undefined
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Recording">
                  <Action.OpenInBrowser title="Open in Dashboard" icon={Icon.Globe} url={playbackUrl} />
                  <Action.CopyToClipboard
                    title="Copy Dashboard URL"
                    icon={Icon.CopyClipboard}
                    content={playbackUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onCopy={() => {
                      void notifyCopied();
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Filters">
                  {workspaceId ? (
                    <Action.Push
                      title="Filter & Sort…"
                      icon={Icon.Filter}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      target={
                        <FiltersScreen
                          workspaceId={workspaceId}
                          value={filters}
                          currentMemberId={currentMemberId}
                          onChange={setFilters}
                        />
                      }
                    />
                  ) : null}
                  {isFiltered(filters) ? (
                    <Action
                      title="Clear Filters"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={clearFilters}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section title="Sort">
                  <Action title="Newest First" icon={Icon.ArrowDown} onAction={() => setSort("created_at", "desc")} />
                  <Action title="Oldest First" icon={Icon.ArrowUp} onAction={() => setSort("created_at", "asc")} />
                  <Action
                    title="Longest First"
                    icon={Icon.BarChart}
                    onAction={() => setSort("recording_duration", "desc")}
                  />
                  <Action
                    title="Shortest First"
                    icon={Icon.BarChart}
                    onAction={() => setSort("recording_duration", "asc")}
                  />
                </ActionPanel.Section>
                {workspaceList.length > 1 ? (
                  <ActionPanel.Submenu title="Switch Workspace" icon={Icon.AppWindow}>
                    {workspaceList.map((w) => (
                      <Action
                        key={w.workspaceId}
                        title={w.workspaceName}
                        onAction={() => setWorkspaceId(w.workspaceId)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                ) : null}
                <Action.OpenInBrowser title="View All in Dashboard" icon={Icon.List} url={dashboardAllUrl} />
                <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
              </ActionPanel>
            }
          />
        );
      })}
      {recordings.hasMore ? (
        <Grid.Item
          key="__view-all-dashboard"
          content={{ source: Icon.ArrowNe, tintColor: Color.Blue }}
          title="View all in Dashboard"
          subtitle="Open the full recordings list"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View All in Dashboard" icon={Icon.Globe} url={dashboardAllUrl} />
              <CommonActions workspaceId={workspaceId || undefined} currentWorkspaceMemberId={currentMemberId} />
            </ActionPanel>
          }
        />
      ) : null}
    </Grid>
  );
}
