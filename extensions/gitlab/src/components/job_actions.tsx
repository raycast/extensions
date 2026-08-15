import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, open, showToast, Toast } from "@raycast/api";
import React from "react";
import fs from "fs";
import path from "path";
import { getArtifactDownloadDirectoryPreference, gitlab } from "../common";
import { getIdFromGqlId } from "../utils";
import { Job, JobArtifact } from "./jobs";
import { JobLogView } from "./job_log";
import { showFailureToast } from "@raycast/utils";

function jobNumericId(job: Job): string {
  return getIdFromGqlId(job.id).toString();
}

export function RefreshJobsAction(props: { onRefreshJobs?: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
      onAction={() => props.onRefreshJobs?.()}
    />
  );
}

export function CancelJobAction(props: { job: Job; onRefreshJobs?: () => void }) {
  async function handle() {
    const jobId = jobNumericId(props.job);
    if (
      !(await confirmAlert({
        title: "Cancel Job?",
        message: `Cancel "${props.job.name}" (#${jobId})?`,
        primaryAction: { title: "Cancel Job", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Canceling job..." });
      await gitlab.post(`projects/${props.job.projectId}/jobs/${jobId}/cancel`);
      showToast(Toast.Style.Success, "Canceled job");
      props.onRefreshJobs?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to cancel job" });
    }
  }
  return (
    <Action
      title="Cancel"
      style={Action.Style.Destructive}
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      onAction={handle}
    />
  );
}

export function RunJobAction(props: { job: Job; onRefreshJobs?: () => void }) {
  async function handle() {
    const jobId = jobNumericId(props.job);
    if (
      !(await confirmAlert({
        title: "Run Job?",
        message: `Run manual job "${props.job.name}" (#${jobId})?`,
        primaryAction: { title: "Run" },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Starting job..." });
      await gitlab.post(`projects/${props.job.projectId}/jobs/${jobId}/play`);
      showToast(Toast.Style.Success, "Started job");
      props.onRefreshJobs?.();
    } catch (error) {
      showFailureToast(error, { title: "Failed to run job" });
    }
  }
  return <Action title="Run" icon={{ source: Icon.Play, tintColor: Color.Green }} onAction={handle} />;
}

export function RetryJobAction(props: { job: Job }) {
  async function handle() {
    const jobId = jobNumericId(props.job);
    if (
      !(await confirmAlert({
        title: "Retry Job?",
        message: `Restart "${props.job.name}" (#${jobId})?`,
        primaryAction: { title: "Retry", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Restarting job..." });
      await gitlab.post(`projects/${props.job.projectId}/jobs/${jobId}/retry`);
      showToast(Toast.Style.Success, "Restarted job");
    } catch (error) {
      showFailureToast(error, { title: "Failed to restart job" });
    }
  }
  return (
    <Action
      title="Retry"
      icon={{ source: Icon.Repeat, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={handle}
    />
  );
}

export function ShowJobLogAction(props: { job: Job; projectFullPath: string }) {
  return (
    <Action.Push
      title="Show Log"
      icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      target={<JobLogView job={props.job} projectFullPath={props.projectFullPath} />}
    />
  );
}

function resolveJobArtifactDownload(job: Job, artifact: JobArtifact): { url: string; fileName: string } | undefined {
  const jobId = jobNumericId(job);
  const fileType = artifact.file_type.toLowerCase();
  const fileName =
    artifact.filename || (fileType === "archive" ? "artifacts.zip" : fileType === "trace" ? "job.log" : "");

  if (fileType === "trace") {
    return { url: gitlab.jobTraceDownloadUrl(job.projectId, jobId), fileName: fileName || "job.log" };
  }
  if (fileType === "archive") {
    return {
      url: gitlab.jobArtifactsArchiveDownloadUrl(job.projectId, jobId),
      fileName: fileName || "artifacts.zip",
    };
  }
  if (artifact.filename) {
    return {
      url: gitlab.jobArtifactDownloadUrl(job.projectId, jobId, artifact.filename),
      fileName: artifact.filename,
    };
  }
  return undefined;
}

async function downloadJobArtifact(job: Job, artifact: JobArtifact) {
  const resolved = resolveJobArtifactDownload(job, artifact);
  if (!resolved) {
    showFailureToast("Artifact has no downloadable path", { title: "Download Failed" });
    return;
  }
  const downloadDir = getArtifactDownloadDirectoryPreference();
  const localFilepath = path.join(downloadDir, `${jobNumericId(job)}-${path.basename(resolved.fileName)}`);
  try {
    await showToast({ style: Toast.Style.Animated, title: "Downloading artifact..." });
    fs.mkdirSync(downloadDir, { recursive: true });
    await gitlab.downloadFile(resolved.url, { localFilepath });
    await open(localFilepath);
    showToast(Toast.Style.Success, "Downloaded artifact", path.basename(localFilepath));
  } catch (error) {
    showFailureToast(error, { title: "Failed to download artifact" });
  }
}

export function DownloadJobArtifactsSubmenu(props: { job: Job }): React.ReactElement | null {
  if (props.job.artifacts.length === 0) {
    return null;
  }
  return (
    <ActionPanel.Submenu
      title="Download Artifact"
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    >
      {props.job.artifacts.map((artifact, index) => (
        <Action
          key={`${artifact.filename ?? artifact.file_type}-${index}`}
          title={
            artifact.size !== undefined
              ? `${artifact.filename || artifact.file_type} (${
                  artifact.size < 1024
                    ? `${artifact.size} B`
                    : artifact.size < 1024 * 1024
                      ? `${(artifact.size / 1024).toFixed(1)} KB`
                      : `${(artifact.size / (1024 * 1024)).toFixed(1)} MB`
                })`
              : artifact.filename || artifact.file_type
          }
          icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
          onAction={() => downloadJobArtifact(props.job, artifact)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
