import { useCallback, useEffect, useState } from "react";

import {
  Cache,
  Color,
  Icon,
  type LaunchProps,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";

import { descript } from "./lib/client";
import { humanizeJobType, isTerminalState, jobTimingDescription } from "./lib/jobs";
import { dismissUpload, listUploads, type EnrichedUploadRecord } from "./lib/upload-tracker";
import type { DescriptJob } from "./lib/types";

// Cross-command nudges: both reasons force a `listJobs` fetch, which is
// what keeps `isLoading=true` for long enough to render — Raycast unloads
// a menu-bar command as soon as its first paint reports `isLoading=false`.
//   - `post-job-kickoff` — sent by the kickoff commands so the freshly
//     started job appears without waiting for the next manifest wake.
//   - `job-state-changed` — sent by `recent-jobs` when its per-id poll
//     observes a `job_state` transition (queued → running → stopped).
type ActivityLaunchContext = { reason?: "post-job-kickoff" | "job-state-changed" };

// Raycast wakes this menu-bar command at the manifest interval (1 min, the
// minimum). Cache the last `listJobs` snapshot and only refetch when:
//   * something is actively running (local upload, or the last snapshot had
//     a non-terminal job) → poll every 1 min, or
//   * we just haven't refreshed in a while → poll every 5 min.
const ACTIVE_REFRESH_MS = 60_000;
const IDLE_REFRESH_MS = 5 * 60_000;
const SNAPSHOT_CACHE = new Cache({ namespace: "descript-activity:snapshot" });
const SNAPSHOT_KEY = "v1";

type JobsSnapshot = { jobs: DescriptJob[]; lastFetchAt: number };
const EMPTY_SNAPSHOT: JobsSnapshot = { jobs: [], lastFetchAt: 0 };

function readSnapshot(): JobsSnapshot {
  try {
    const raw = SNAPSHOT_CACHE.get(SNAPSHOT_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<JobsSnapshot>;
    return {
      jobs: Array.isArray(parsed.jobs) ? (parsed.jobs as DescriptJob[]) : [],
      lastFetchAt: typeof parsed.lastFetchAt === "number" ? parsed.lastFetchAt : 0,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function writeSnapshot(snapshot: JobsSnapshot) {
  try {
    SNAPSHOT_CACHE.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Non-fatal — we'll re-fetch and re-write on the next wake.
  }
}

export default function DescriptActivity(props: LaunchProps<{ launchContext: ActivityLaunchContext }>) {
  const wasNudgedByAnotherCommand =
    props.launchContext?.reason === "post-job-kickoff" || props.launchContext?.reason === "job-state-changed";

  const { data: uploads = [], mutate: mutateUploads } = useCachedPromise(async () => listUploads(), [], {
    keepPreviousData: true,
  });

  async function handleDismiss(jobId: string) {
    await mutateUploads(dismissUpload(jobId), {
      optimisticUpdate: (prev) => (prev ?? []).filter((u) => u.jobId !== jobId),
    });
  }

  const [snapshot, setSnapshot] = useState<JobsSnapshot>(() => readSnapshot());
  const [jobsLoading, setJobsLoading] = useState(false);

  const activeUploads = uploads.filter((u) => u.aggregate === "uploading" || u.aggregate === "pending");
  const finishedUploads = uploads.filter((u) => u.aggregate === "completed" || u.aggregate === "failed");
  const runningRemoteJobs = snapshot.jobs.filter((j) => !isTerminalState(j.job_state));
  const recentlyFinishedRemote = snapshot.jobs.filter((j) => isTerminalState(j.job_state)).slice(0, 5);

  const isActive = activeUploads.length > 0 || runningRemoteJobs.length > 0;
  const threshold = isActive ? ACTIVE_REFRESH_MS : IDLE_REFRESH_MS;
  const shouldFetchJobs = wasNudgedByAnotherCommand || Date.now() - snapshot.lastFetchAt >= threshold;

  const refreshJobs = useCallback(async (cancelled?: { current: boolean }) => {
    setJobsLoading(true);
    try {
      const response = await descript.listJobs({ limit: 20 });
      if (cancelled?.current) return;
      const next: JobsSnapshot = { jobs: response.jobs ?? [], lastFetchAt: Date.now() };
      writeSnapshot(next);
      setSnapshot(next);
    } catch {
      // Transient API error — keep showing the cached snapshot.
    } finally {
      if (!cancelled?.current) setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldFetchJobs) return;
    const cancelled = { current: false };
    refreshJobs(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [shouldFetchJobs, refreshJobs]);

  const totalActive = activeUploads.length + runningRemoteJobs.length;
  const failedCount = finishedUploads.filter((u) => u.aggregate === "failed").length;

  const tooltip = buildTooltip(activeUploads.length, runningRemoteJobs.length, failedCount);

  return (
    <MenuBarExtra
      icon={MENU_BAR_ICON}
      title={menuBarTitle(totalActive, failedCount)}
      tooltip={tooltip}
      isLoading={jobsLoading}
    >
      {activeUploads.length > 0 ? (
        <MenuBarExtra.Section title="Uploading from your Mac">
          {activeUploads.map((upload) => (
            <UploadItem key={upload.id} upload={upload} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {runningRemoteJobs.length > 0 ? (
        <MenuBarExtra.Section title="Descript jobs in progress">
          {runningRemoteJobs.map((job) => (
            <RemoteJobItem key={job.job_id} job={job} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {finishedUploads.length > 0 ? (
        <MenuBarExtra.Section title="Recently finished uploads">
          {finishedUploads.map((upload) => (
            <FinishedUploadItem key={upload.id} upload={upload} onDismiss={handleDismiss} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {recentlyFinishedRemote.length > 0 ? (
        <MenuBarExtra.Section title="Recently finished jobs">
          {recentlyFinishedRemote.map((job) => (
            <RemoteJobItem key={job.job_id} job={job} />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {totalActive === 0 && finishedUploads.length === 0 && recentlyFinishedRemote.length === 0 ? (
        <MenuBarExtra.Item title="No active uploads or jobs" icon={Icon.Check} />
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh Now" icon={Icon.ArrowClockwise} onAction={() => refreshJobs()} />
        <MenuBarExtra.Item
          title="Open Recent Jobs"
          icon={Icon.Bolt}
          onAction={async () => {
            await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Open Browse Projects"
          icon={Icon.AppWindowGrid3x3}
          onAction={async () => {
            await launchCommand({ name: "browse-projects", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Import Selected Media"
          icon={Icon.Upload}
          onAction={async () => {
            await launchCommand({ name: "import-selected-media", type: LaunchType.UserInitiated });
          }}
        />
        <MenuBarExtra.Item
          title="Configure"
          icon={Icon.Gear}
          onAction={async () => {
            await openCommandPreferences();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function UploadItem({ upload }: { upload: EnrichedUploadRecord }) {
  const done = upload.files.filter((f) => f.status === "done").length;
  const total = upload.files.length;
  const failed = upload.files.filter((f) => f.status === "failed").length;
  const subtitle = failed > 0 ? `${done}/${total} done · ${failed} failed` : `${done}/${total} files`;

  return (
    <MenuBarExtra.Submenu title={`${truncate(uploadTitle(upload))} · ${subtitle}`} icon={iconForUpload(upload)}>
      {upload.projectUrl ? (
        <MenuBarExtra.Item
          title="Open Project"
          icon={Icon.Globe}
          onAction={async () => {
            if (upload.projectUrl) await open(upload.projectUrl);
          }}
        />
      ) : null}
      <MenuBarExtra.Item
        title="See in Recent Jobs"
        icon={Icon.Bolt}
        onAction={async () => {
          await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
        }}
      />
      <MenuBarExtra.Section title="Files">
        {upload.files.map((file) => (
          <MenuBarExtra.Item
            key={file.statusFilePath}
            title={`${truncate(file.fileName)} · ${humanFileStatus(file.status)}`}
            icon={iconForFileStatus(file.status)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}

function FinishedUploadItem({
  upload,
  onDismiss,
}: {
  upload: EnrichedUploadRecord;
  onDismiss: (jobId: string) => Promise<void> | void;
}) {
  const succeeded = upload.aggregate === "completed";
  const failed = upload.files.filter((f) => f.status === "failed");
  const summary = succeeded
    ? `Uploaded · ${upload.files.length} file${upload.files.length === 1 ? "" : "s"}`
    : `${failed.length}/${upload.files.length} failed`;

  return (
    <MenuBarExtra.Submenu
      title={`${truncate(uploadTitle(upload))} · ${summary}`}
      icon={
        succeeded
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.ExclamationMark, tintColor: Color.Red }
      }
    >
      {upload.projectUrl ? (
        <MenuBarExtra.Item
          title="Open Project"
          icon={Icon.Globe}
          onAction={async () => {
            if (upload.projectUrl) await open(upload.projectUrl);
          }}
        />
      ) : null}
      <MenuBarExtra.Item title="Dismiss" icon={Icon.Check} onAction={() => onDismiss(upload.jobId)} />
      {!succeeded ? (
        <MenuBarExtra.Section title="Failed files">
          {failed.map((file) => (
            <MenuBarExtra.Item
              key={file.statusFilePath}
              title={`${truncate(file.fileName)} · HTTP ${file.httpCode ?? "?"}`}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra.Submenu>
  );
}

function RemoteJobItem({ job }: { job: DescriptJob }) {
  const label = humanLabelForJob(job);
  const timing = jobTimingDescription(job);
  const titleSuffix = timing ? ` · ${timing.text}` : "";
  const shareUrl = job.result?.share_url;
  const downloadUrl = job.result?.download_url;
  const title = `${humanizeJobType(job.job_type)} · ${truncate(label)}${titleSuffix}`;
  const icon = iconForRemoteJob(job);

  const destinationCount = (shareUrl ? 1 : 0) + (job.project_url ? 1 : 0);

  if (destinationCount <= 1) {
    return (
      <MenuBarExtra.Item
        title={title}
        tooltip={timing?.tooltip}
        icon={icon}
        onAction={async () => {
          if (shareUrl) {
            await open(shareUrl);
          } else if (job.project_url) {
            await open(job.project_url);
          } else {
            await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
          }
        }}
      />
    );
  }

  return (
    <MenuBarExtra.Submenu title={title} icon={icon}>
      {shareUrl ? (
        <MenuBarExtra.Item
          title="Open Share URL"
          icon={Icon.Globe}
          onAction={async () => {
            await open(shareUrl);
          }}
        />
      ) : null}
      {job.project_url ? (
        <MenuBarExtra.Item
          title="Open Project"
          icon={Icon.Pencil}
          onAction={async () => {
            if (job.project_url) await open(job.project_url);
          }}
        />
      ) : null}
      {downloadUrl ? (
        <MenuBarExtra.Item
          title="Open Download URL"
          icon={Icon.Download}
          onAction={async () => {
            await open(downloadUrl);
          }}
        />
      ) : null}
      <MenuBarExtra.Item
        title="See in Recent Jobs"
        icon={Icon.Bolt}
        onAction={async () => {
          await launchCommand({ name: "recent-jobs", type: LaunchType.UserInitiated });
        }}
      />
    </MenuBarExtra.Submenu>
  );
}

function uploadTitle(upload: EnrichedUploadRecord): string {
  if (upload.files.length === 1) return upload.files[0].fileName;
  const project = upload.projectName ?? "files";
  return `${upload.files.length} files → ${project}`;
}

function iconForUpload(upload: EnrichedUploadRecord) {
  switch (upload.aggregate) {
    case "completed":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case "uploading": {
      const total = upload.files.length;
      const done = upload.files.filter((f) => f.status === "done").length;
      const fraction = total > 0 ? done / total : 0;
      return getProgressIcon(fraction, Color.Blue);
    }
    case "pending":
    default:
      return { source: Icon.Clock };
  }
}

function iconForRemoteJob(job: DescriptJob) {
  if (job.job_state === "stopped") {
    if (job.result?.status === "failure") {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    if (job.result?.status === "partial_success") {
      return { source: Icon.Warning, tintColor: Color.Yellow };
    }
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (job.job_state === "failed") return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (job.job_state === "cancelled") return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
  if (job.job_state === "queued") return { source: Icon.Clock, tintColor: Color.SecondaryText };
  return { source: Icon.Bolt, tintColor: Color.Blue };
}

function humanLabelForJob(job: DescriptJob): string {
  // For terminal jobs the progress label is stale, so prefer a state-derived
  // label so users see "Done" / "Failed" instead of e.g. "Uploading 80%".
  if (job.job_state === "stopped") {
    if (job.result?.status === "failure") return job.result?.message ?? "Failed";
    if (job.result?.status === "partial_success") return "Partial success";
    return "Done";
  }
  if (job.job_state === "failed") return job.error?.message ?? "Failed";
  if (job.job_state === "cancelled") return "Canceled";
  return job.progress?.label ?? job.job_state ?? "Running";
}

function iconForFileStatus(status: EnrichedUploadRecord["files"][number]["status"]) {
  switch (status) {
    case "done":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case "uploading":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "pending":
    default:
      return { source: Icon.Clock };
  }
}

function humanFileStatus(status: EnrichedUploadRecord["files"][number]["status"]): string {
  switch (status) {
    case "done":
      return "uploaded";
    case "failed":
      return "failed";
    case "uploading":
      return "uploading";
    default:
      return "queued";
  }
}

function truncate(text: string, max = 40): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function menuBarTitle(active: number, failed: number): string | undefined {
  if (failed > 0) return `! ${active}`;
  if (active > 0) return String(active);
  return undefined;
}

const MENU_BAR_ICON = { source: "descript-mark-notify.svg" };

function buildTooltip(activeUploads: number, runningRemote: number, failed: number): string {
  const parts: string[] = [];
  if (activeUploads > 0) parts.push(`${activeUploads} uploading`);
  if (runningRemote > 0) parts.push(`${runningRemote} processing`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (parts.length === 0) return "Descript — no active jobs";
  return `Descript — ${parts.join(", ")}`;
}
