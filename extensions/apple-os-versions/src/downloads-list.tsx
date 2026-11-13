import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showInFinder } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import {
  cancelDownload,
  downloadDirectory,
  formatBytes,
  isActive,
  Job,
  listJobs,
  partialDataSize,
  removeJob,
  startDownload,
} from "./downloads";

const REFRESH_MS = 1000;

type Display = {
  icon: List.Item.Props["icon"];
  state: string;
  stateColor: Color;
  detail?: string;
};

function percent(job: Job): number | undefined {
  const total = job.request.size;
  return total ? Math.min(0.99, job.downloadedBytes / total) : undefined;
}

function display(job: Job): Display {
  const { status } = job;
  const total = job.request.size;
  switch (status.state) {
    case "none":
      return { icon: getProgressIcon(0, Color.Blue), state: "Starting", stateColor: Color.Blue };
    case "downloading": {
      const fraction = percent(job);
      const amount = total
        ? `${formatBytes(job.downloadedBytes)} of ${formatBytes(total)}`
        : formatBytes(job.downloadedBytes);
      return {
        icon: getProgressIcon(fraction ?? 0, Color.Blue),
        state: fraction === undefined ? "Downloading" : `${Math.floor(fraction * 100)}%`,
        stateColor: Color.Blue,
        detail: amount,
      };
    }
    case "building":
      return {
        icon: { source: Icon.Cd, tintColor: Color.Orange },
        state: "Building ISO",
        stateColor: Color.Orange,
        detail: "Enter your password when asked",
      };
    case "done":
      return fs.existsSync(job.dest)
        ? {
            icon: { source: Icon.CheckCircle, tintColor: Color.Green },
            state: "Done",
            stateColor: Color.Green,
            detail: formatBytes(job.downloadedBytes),
          }
        : {
            icon: { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText },
            state: "Moved or Deleted",
            stateColor: Color.SecondaryText,
          };
    case "failed":
      return {
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        state: status.reason === "Cancelled" ? "Cancelled" : "Failed",
        stateColor: Color.Red,
        detail: status.reason === "Cancelled" ? undefined : status.reason,
      };
    case "stopped":
      return {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
        state: "Stopped",
        stateColor: Color.Red,
        detail: "The download process ended unexpectedly",
      };
  }
}

async function confirmRemove(job: Job): Promise<boolean> {
  const size = partialDataSize(job);
  if (size === 0) return true;
  return confirmAlert({
    title: "Remove Download?",
    message: `This also deletes ${formatBytes(size)} of partially downloaded data, so a retry starts from scratch.`,
    primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
  });
}

export function DownloadsList() {
  const [jobs, setJobs] = useState<Job[]>(() => listJobs());
  const refresh = () => setJobs(listJobs());

  // Progress comes from the files the background workers write, so polling picks up every download,
  // including ones started before this view opened.
  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const active = jobs.filter(isActive);
  const finished = jobs.filter((job) => !isActive(job));
  const finishedRemovable = finished.filter((job) => job.status.state === "done");

  const clearFinished = () => {
    finishedRemovable.forEach(removeJob);
    refresh();
  };

  const item = (job: Job) => {
    const info = display(job);
    const accessories: List.Item.Accessory[] = [];
    if (info.detail) accessories.push({ text: info.detail });
    accessories.push({ tag: { value: info.state, color: info.stateColor } });
    accessories.push({ date: new Date(job.startedAt), tooltip: "Started" });
    const canRetry = job.status.state === "failed" || job.status.state === "stopped";

    return (
      <List.Item
        key={job.id}
        icon={info.icon}
        title={path.basename(job.dest)}
        subtitle={job.request.buildIso ? "Installer ISO" : undefined}
        keywords={[job.request.title]}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {job.status.state === "done" && fs.existsSync(job.dest) && (
                <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(job.dest)} />
              )}
              {job.status.state === "downloading" && (
                <Action
                  title="Cancel Download"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => {
                    cancelDownload(job);
                    refresh();
                  }}
                />
              )}
              {canRetry && (
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  onAction={async () => {
                    await startDownload(job.request);
                    refresh();
                  }}
                />
              )}
              <Action.Open
                title="Open Download Folder"
                icon={Icon.Folder}
                target={path.dirname(job.dest)}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              {fs.existsSync(job.logFile) && <Action.Open title="Show Log" icon={Icon.Document} target={job.logFile} />}
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy Download URL" content={job.request.url} />
              {!isActive(job) && (
                <Action
                  title="Remove from List"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={async () => {
                    if (await confirmRemove(job)) {
                      removeJob(job);
                      refresh();
                    }
                  }}
                />
              )}
              {finishedRemovable.length > 0 && (
                <Action
                  title="Clear Completed Downloads"
                  icon={Icon.Eraser}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={clearFinished}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle="Downloads" searchBarPlaceholder="Filter downloads">
      <List.EmptyView
        icon={Icon.Download}
        title="No Downloads"
        description={`Firmware and installers you download are saved to ${downloadDirectory()}.`}
      />
      <List.Section title="In Progress">{active.map(item)}</List.Section>
      <List.Section title="Finished">{finished.map(item)}</List.Section>
    </List>
  );
}
