import { useEffect, useMemo, useRef, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { renderAuthError } from "./lib/auth-ui";
import { descript } from "./lib/client";
import { humanizeJobType, isTerminalState, jobStatusAccessory, jobTimingDescription } from "./lib/jobs";
import { onLoadError } from "./lib/load-errors";
import { relativeTime, formatDateTime } from "./lib/format";
import { showErrorToast } from "./lib/toast";
import {
  dismissUpload,
  listUploads,
  removeUploadRecord,
  stopUpload,
  type EnrichedUploadRecord,
} from "./lib/upload-tracker";
import type { DescriptJob, JobType, JobTypeFilter } from "./lib/types";

const POLL_INTERVAL_MS = 5_000;
const UPLOAD_POLL_INTERVAL_MS = 2_000;
const JOBS_PAGE_SIZE = 25;

const ALL_JOB_FILTER = "__all__";
const PUBLISH_CLIENT_FILTER = "__publish__";

type FilterValue = typeof ALL_JOB_FILTER | typeof PUBLISH_CLIENT_FILTER | JobTypeFilter;

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string; icon: Icon }> = [
  { value: ALL_JOB_FILTER, label: "All jobs", icon: Icon.Bolt },
  { value: "import/project_media", label: "Imports", icon: Icon.Upload },
  { value: "agent", label: "Underlord edits", icon: Icon.Wand },
  { value: PUBLISH_CLIENT_FILTER, label: "Publishes", icon: Icon.Globe },
];

export default function RecentJobs() {
  const [filter, setFilter] = useState<FilterValue>(ALL_JOB_FILTER);

  // `type` query: import and agent; publish jobs are matched client-side from the list.
  const requestType = filter === "import/project_media" || filter === "agent" ? filter : undefined;

  const cursorsRef = useRef<(string | undefined)[]>([undefined]);

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    error,
    revalidate,
    pagination,
  } = useCachedPromise(
    (typeParam: JobTypeFilter | undefined) =>
      async ({ page }: { page: number }) => {
        if (page === 0) cursorsRef.current = [undefined];

        const cursor = cursorsRef.current[page];
        if (page > 0 && !cursor) {
          return { data: [] as DescriptJob[], hasMore: false };
        }

        const response = await descript.listJobs({
          limit: JOBS_PAGE_SIZE,
          cursor,
          type: typeParam,
        });

        cursorsRef.current[page + 1] = response.cursor ?? undefined;
        return {
          data: response.jobs ?? [],
          hasMore: Boolean(response.cursor),
        };
      },
    [requestType],
    { keepPreviousData: true, onError: onLoadError("Could not load jobs") },
  );

  const {
    data: uploadsData,
    isLoading: isLoadingUploads,
    revalidate: revalidateUploads,
    mutate: mutateUploads,
  } = useCachedPromise(async () => listUploads(), [], { keepPreviousData: true });

  async function handleDismiss(jobId: string) {
    await mutateUploads(dismissUpload(jobId), {
      optimisticUpdate: (prev) => (prev ?? []).filter((u) => u.jobId !== jobId),
    });
  }

  async function handleForget(jobId: string) {
    await mutateUploads(removeUploadRecord(jobId), {
      optimisticUpdate: (prev) => (prev ?? []).filter((u) => u.jobId !== jobId),
    });
  }

  async function handleStop(upload: EnrichedUploadRecord) {
    const confirmed = await confirmAlert({
      title: "Stop this upload?",
      message: upload.isExistingProject
        ? "The remaining file transfers will be stopped."
        : "The remaining file transfers will be stopped and the import job canceled.",
      primaryAction: { title: "Stop Upload", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping upload…" });
    try {
      await stopUpload(upload);
      toast.style = Toast.Style.Success;
      toast.title = "Upload stopped";
      revalidateUploads();
      launchCommand({
        name: "descript-activity",
        type: LaunchType.Background,
        context: { reason: "job-state-changed" },
      }).catch(() => {
        // Non-fatal — the next manifest wake will catch up.
      });
    } catch (error) {
      await toast.hide();
      await showErrorToast("Could not stop upload", error);
    }
  }

  // Per-job overlay of freshly polled status so we can keep in-flight jobs
  // live without calling `revalidate()` (which would reset the paginated
  // page stack back to page 0 and yank the user to the top of the list).
  const [jobOverlay, setJobOverlay] = useState<Record<string, DescriptJob>>({});

  // Merge the paginated server list with any newer per-job snapshots. We
  // prefer whichever side has the most recent `updated_at`, so a manual
  // revalidate of the list can't be overridden by a stale overlay entry.
  const allJobs = useMemo(
    () => (jobsData ?? []).map((job) => preferNewer(job, jobOverlay[job.job_id])),
    [jobsData, jobOverlay],
  );
  const jobs = useMemo(() => filterJobs(allJobs, filter), [allJobs, filter]);
  const uploads = uploadsData ?? [];
  const isLoading = isLoadingJobs || isLoadingUploads;

  // Don't show local upload sections when the user is filtering away from
  // imports — those rows would be misleading in a "publishes only" view.
  const showUploads = filter === ALL_JOB_FILTER || filter === "import/project_media";

  // De-duplicate: if a job has a matching local upload record, prefer the
  // local row (which carries per-file detail) for any state where we still
  // care about per-file outcomes. Once the server-side job is `stopped` AND
  // every local file is `done`, we can drop the local row.
  const uploadJobIds = new Set(
    uploads.filter((u) => !(u.aggregate === "completed" && jobsTerminalById(jobs, u.jobId))).map((u) => u.jobId),
  );
  const remoteOnlyJobs = jobs.filter((j) => !uploadJobIds.has(j.job_id));

  const hasRunningUpload = uploads.some((u) => u.aggregate === "uploading" || u.aggregate === "pending");

  // Per-job poll so `revalidate()` doesn't reset paginated list position.
  const inFlightJobIds = useMemo(
    () => Array.from(new Set(allJobs.filter((j) => !isTerminalState(j.job_state)).map((j) => j.job_id))).sort(),
    [allJobs],
  );
  const inFlightJobIdsKey = inFlightJobIds.join(",");

  // Last `job_state` seen per job by the poll below. A ref (not state) so the
  // interval callback always reads the latest values: reading `jobOverlay`
  // directly would capture the snapshot from when the effect mounted, making
  // every tick look like a state transition and nudging the menu bar (an
  // extra `listJobs` call) every 5 seconds.
  const lastSeenStatesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (inFlightJobIds.length === 0) return;
    let cancelled = false;
    const handle = setInterval(async () => {
      const results = await Promise.all(
        inFlightJobIds.map(async (id) => {
          try {
            return [id, await descript.getJob(id)] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const updates: Record<string, DescriptJob> = {};
      // Nudge the menu bar on first observation of a job (it may not have
      // it yet — e.g. started in the Descript app while menu bar was idle)
      // or on any `job_state` transition. Progress-only updates don't
      // qualify; the overlay already reflects them locally.
      let shouldNudgeMenuBar = false;
      for (const result of results) {
        if (result) {
          const [id, job] = result;
          const previousState = lastSeenStatesRef.current[id];
          updates[id] = job;
          if (job.job_state) {
            lastSeenStatesRef.current[id] = job.job_state;
          }
          if (previousState === undefined || previousState !== job.job_state) {
            shouldNudgeMenuBar = true;
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        setJobOverlay((prev) => ({ ...prev, ...updates }));
      }
      if (shouldNudgeMenuBar) {
        launchCommand({
          name: "descript-activity",
          type: LaunchType.Background,
          context: { reason: "job-state-changed" },
        }).catch(() => {
          // Non-fatal — the next manifest wake will catch up.
        });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [inFlightJobIdsKey]);

  useAutoRefresh(hasRunningUpload, revalidateUploads, UPLOAD_POLL_INTERVAL_MS);

  // Render auth/missing-token UX after all hooks have been called, so React
  // doesn't see a different number of hooks across renders when the error
  // toggles.
  const errorView = renderAuthError(error, () => {
    revalidate();
    revalidateUploads();
  });
  if (errorView) return errorView;

  const activeUploads = showUploads
    ? uploads.filter((u) => u.aggregate === "uploading" || u.aggregate === "pending")
    : [];
  const completedUploads = showUploads
    ? uploads.filter((u) => u.aggregate === "completed" || u.aggregate === "failed")
    : [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search jobs by type, state, or ID…"
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by job type"
          value={filter}
          onChange={(value) => setFilter(value as FilterValue)}
        >
          {FILTER_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.label} icon={option.icon} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              revalidate();
              revalidateUploads();
            }}
          />
        </ActionPanel>
      }
    >
      {jobs.length === 0 && activeUploads.length === 0 && completedUploads.length === 0 && !isLoading ? (
        <List.EmptyView
          title={filter === ALL_JOB_FILTER ? "No recent jobs" : "No matching jobs"}
          description={
            filter === ALL_JOB_FILTER
              ? "Start an import or run an Underlord prompt to populate this list."
              : "Try a different filter, or trigger a job of this type."
          }
          icon={Icon.Bolt}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {activeUploads.length > 0 ? (
            <List.Section title="Background uploads">
              {activeUploads.map((upload) => (
                <UploadRow
                  key={upload.id}
                  upload={upload}
                  onReload={revalidateUploads}
                  onDismiss={handleDismiss}
                  onForget={handleForget}
                  onStop={handleStop}
                />
              ))}
            </List.Section>
          ) : null}

          {completedUploads.length > 0 ? (
            <List.Section title="Recently finished">
              {completedUploads.map((upload) => (
                <UploadRow
                  key={upload.id}
                  upload={upload}
                  onReload={revalidateUploads}
                  onDismiss={handleDismiss}
                  onForget={handleForget}
                  onStop={handleStop}
                />
              ))}
            </List.Section>
          ) : null}

          {remoteOnlyJobs.length > 0 ? (
            <List.Section title="Descript jobs">
              {remoteOnlyJobs.map((job) => (
                <JobItem key={job.job_id} job={job} onReload={revalidate} />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}

function filterJobs(jobs: DescriptJob[], filter: FilterValue): DescriptJob[] {
  if (filter === ALL_JOB_FILTER) return jobs;
  if (filter === PUBLISH_CLIENT_FILTER) {
    return jobs.filter((job) => job.job_type === "publish");
  }
  if (filter === "import/project_media") {
    return jobs.filter(
      (job) =>
        job.job_type === "import/project_media" || job.job_type === "import" || job.job_type === "import_project_media",
    );
  }
  if (filter === "agent") {
    return jobs.filter((job) => job.job_type === "agent");
  }
  return jobs;
}

function jobsTerminalById(jobs: DescriptJob[], jobId: string): boolean {
  const job = jobs.find((j) => j.job_id === jobId);
  return Boolean(job && isTerminalState(job.job_state));
}

function UploadRow({
  upload,
  onReload,
  onDismiss,
  onForget,
  onStop,
}: {
  upload: EnrichedUploadRecord;
  onReload: () => void;
  onDismiss: (jobId: string) => Promise<void> | void;
  onForget: (jobId: string) => Promise<void> | void;
  onStop: (upload: EnrichedUploadRecord) => Promise<void> | void;
}) {
  const { tag, color, icon } = uploadAccessory(upload);
  const doneCount = upload.files.filter((f) => f.status === "done").length;
  const failedCount = upload.files.filter((f) => f.status === "failed").length;
  const total = upload.files.length;

  const accessories: List.Item.Accessory[] = [
    { text: `${doneCount}/${total}`, tooltip: `${doneCount} of ${total} files uploaded` },
  ];
  if (failedCount > 0) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      tooltip: `${failedCount} failed`,
    });
  }
  if (upload.startedAt) {
    const rel = relativeTime(upload.startedAt);
    const abs = formatDateTime(upload.startedAt);
    if (rel) {
      accessories.push({ text: rel, tooltip: abs ? `Started ${abs}` : undefined });
    } else {
      accessories.push({ date: new Date(upload.startedAt), tooltip: abs ? `Started ${abs}` : "Started at" });
    }
  }
  accessories.push({ tag: { value: tag, color }, icon, tooltip: tag });

  const subtitle = upload.isExistingProject
    ? `Adding to ${upload.projectName ?? upload.projectId ?? "existing project"}`
    : `Creating ${upload.projectName ?? "new project"}`;

  return (
    <List.Item
      icon={{ source: Icon.Upload, tintColor: Color.Blue }}
      title={uploadTitle(upload)}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          {upload.projectUrl ? <Action.OpenInBrowser url={upload.projectUrl} title="Open Project" /> : null}
          {upload.aggregate === "completed" || upload.aggregate === "failed" ? (
            <Action
              title="Dismiss"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => onDismiss(upload.jobId)}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Job ID"
            content={upload.jobId}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onReload}
          />
          {upload.aggregate === "uploading" || upload.aggregate === "pending" ? (
            <Action
              title="Stop Upload"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onStop(upload)}
            />
          ) : null}
          <Action
            title="Forget Locally"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={() => onForget(upload.jobId)}
          />
        </ActionPanel>
      }
    />
  );
}

function uploadTitle(upload: EnrichedUploadRecord): string {
  if (upload.files.length === 1) return upload.files[0].fileName;
  return `${upload.files.length} files`;
}

function uploadAccessory(upload: EnrichedUploadRecord): {
  tag: string;
  color: Color;
  icon: { source: Icon; tintColor?: Color };
} {
  switch (upload.aggregate) {
    case "completed":
      return { tag: "Uploaded", color: Color.Green, icon: { source: Icon.CheckCircle, tintColor: Color.Green } };
    case "failed":
      return { tag: "Upload failed", color: Color.Red, icon: { source: Icon.ExclamationMark, tintColor: Color.Red } };
    case "uploading":
      return { tag: "Uploading", color: Color.Blue, icon: { source: Icon.CircleProgress, tintColor: Color.Blue } };
    case "pending":
    default:
      return { tag: "Queued", color: Color.SecondaryText, icon: { source: Icon.Clock } };
  }
}

function JobItem({ job, onReload }: { job: DescriptJob; onReload: () => void }) {
  const status = jobStatusAccessory(job);
  const subtitle = job.progress?.label ?? job.result?.message ?? job.error?.message ?? "";
  const timing = jobTimingDescription(job);

  const accessories: List.Item.Accessory[] = [];
  if (timing) {
    accessories.push({ text: timing.text, tooltip: timing.tooltip });
  }
  accessories.push({
    tag: { value: status.value, color: status.color },
    icon: status.icon,
    tooltip: job.job_state,
  });

  return (
    <List.Item
      icon={iconForJobType(job.job_type)}
      title={formatJobTitle(job)}
      subtitle={subtitle}
      accessories={accessories}
      actions={<JobActions job={job} onReload={onReload} />}
    />
  );
}

function JobActions({ job, onReload }: { job: DescriptJob; onReload: () => void }) {
  const canCancel = !isTerminalState(job.job_state);

  async function handleCancel() {
    const confirmed = await confirmAlert({
      title: "Cancel this job?",
      message: `Job ${job.job_id} will be stopped. Already-consumed credits will not be refunded.`,
      primaryAction: { title: "Cancel Job", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Canceling job…" });
    try {
      await descript.cancelJob(job.job_id);
      toast.style = Toast.Style.Success;
      toast.title = "Job canceled";
      onReload();
    } catch (error) {
      await toast.hide();
      await showErrorToast("Could not cancel job", error);
    }
  }

  const shareUrl = job.result?.share_url;

  return (
    <ActionPanel>
      {shareUrl ? <Action.OpenInBrowser url={shareUrl} title="Open Share URL" icon={Icon.Globe} /> : null}
      {job.project_url ? <Action.OpenInBrowser url={job.project_url} title="Open Project" /> : null}
      {shareUrl ? (
        <Action.CopyToClipboard title="Copy Share URL" content={shareUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Job ID"
        content={job.job_id}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onReload}
      />
      {canCancel ? (
        <Action
          title="Cancel Job"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={handleCancel}
        />
      ) : null}
    </ActionPanel>
  );
}

function formatJobTitle(job: DescriptJob): string {
  const label = humanizeJobType(job.job_type);
  if (job.project_id) return `${label} · ${job.project_id}`;
  return `${label} · ${job.job_id}`;
}

function iconForJobType(type: JobType | undefined): { source: Icon; tintColor?: Color } {
  switch (type) {
    case "import/project_media":
    case "import":
    case "import_project_media":
      return { source: Icon.Upload, tintColor: Color.Blue };
    case "agent":
      return { source: Icon.Wand, tintColor: Color.Purple };
    case "publish":
      return { source: Icon.Globe, tintColor: Color.Green };
    case "transcribe":
      return { source: Icon.SpeechBubble, tintColor: Color.Orange };
    case "export":
      return { source: Icon.Download, tintColor: Color.Magenta };
    default:
      return { source: Icon.Bolt };
  }
}

function useAutoRefresh(enabled: boolean, refresh: () => void, intervalMs: number) {
  useEffect(() => {
    if (!enabled) return;
    const handle = setInterval(refresh, intervalMs);
    return () => clearInterval(handle);
  }, [enabled, refresh, intervalMs]);
}

/**
 * Picks the most up-to-date snapshot of a job between a server list response
 * and a separately polled per-job response, using `updated_at` as the
 * tie-breaker. Falls back to the polled side if timestamps are missing.
 */
function preferNewer(server: DescriptJob, polled: DescriptJob | undefined): DescriptJob {
  if (!polled) return server;
  const serverTime = server.updated_at ? new Date(server.updated_at).getTime() : 0;
  const polledTime = polled.updated_at ? new Date(polled.updated_at).getTime() : 0;
  return polledTime >= serverTime ? polled : server;
}
