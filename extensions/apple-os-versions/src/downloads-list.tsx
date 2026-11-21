import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showInFinder,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
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

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// A finished download whose file is still where it was saved.
function hasFile(job: Job): boolean {
  return job.status.state === "done" && fs.existsSync(job.dest);
}

// Removes jobs and reports any that were retried in the meantime and so were left alone.
async function removeJobs(jobs: Job[]) {
  const kept = jobs.filter((job) => !removeJob(job)).length;
  if (kept) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${plural(kept, "download")} kept`,
      message: "Retried while being removed, so left in the list",
    });
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
  const withFiles = finished.filter(hasFile);

  // Forgets every download that isn't running. Files in the download folder stay where they are.
  const clearHistory = async () => {
    const partial = finished.reduce((total, job) => total + partialDataSize(job), 0);
    const confirmed = await confirmAlert({
      title: "Clear Download History?",
      message:
        `Removes ${plural(finished.length, "download")} from the list` +
        (partial ? ` and deletes ${formatBytes(partial)} of partially downloaded data` : "") +
        ". Downloaded files stay in your download folder.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeJobs(finished);
    refresh();
  };

  // Only files this extension downloaded, and still at the path it saved them to, go to the Trash.
  const trashFiles = async (targets: Job[]) => {
    const size = targets.reduce((total, job) => total + job.downloadedBytes, 0);
    const confirmed = await confirmAlert({
      title: targets.length === 1 ? "Move File to Trash?" : "Move Downloaded Files to Trash?",
      message:
        targets.length === 1
          ? `Moves ${path.basename(targets[0].dest)} (${formatBytes(size)}) to the Trash and removes it from the list.`
          : `Moves ${plural(targets.length, "file")} (${formatBytes(size)}) to the Trash and removes them from the list.`,
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(targets.map((job) => job.dest));
      await removeJobs(targets);
      await showToast({ style: Toast.Style.Success, title: `Moved ${plural(targets.length, "file")} to the Trash` });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't Move to Trash", message: String(error) });
    }
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
        keywords={[job.request.title]}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {hasFile(job) && (
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
                      await removeJobs([job]);
                      refresh();
                    }
                  }}
                />
              )}
              {hasFile(job) && (
                <Action
                  title="Move File to Trash"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => trashFiles([job])}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="All Downloads">
              {finished.length > 0 && (
                <Action
                  title="Clear Download History"
                  icon={Icon.Eraser}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={clearHistory}
                />
              )}
              {withFiles.length > 0 && (
                <Action
                  title="Move All Downloaded Files to Trash"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => trashFiles(withFiles)}
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
