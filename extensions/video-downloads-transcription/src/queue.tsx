import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  List,
  Toast,
  launchCommand,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { useEffect, useRef, useState } from "react";
import { Settings, formatDuration } from "./core";
import { errorAction } from "./open-setup";
import {
  Job,
  JobSpec,
  cancelJob,
  enqueue,
  isActive,
  isPlaylist,
  queueFolder,
  readJobs,
  removeJob,
  retryJob,
  startWorker,
  workerProcess,
} from "./jobs";
import { TranscriptionOptions } from "./whisper";

/** Updates the menu bar item right away instead of at its next refresh. */
function refreshMenuBar() {
  launchCommand({ name: "queue-menu-bar", type: LaunchType.Background }).catch(
    () => undefined,
  );
}

/** What a job does, such as `transcription` or `MP4 download`. */
export function jobNoun(spec: JobSpec): string {
  switch (spec.kind) {
    case "file":
    case "video":
      return "transcription";
    case "playlist":
      return "subtitle download";
    case "media":
    case "playlist-media":
      return `${spec.format.toUpperCase()} download`;
    case "images":
      return "photo download";
    case "model":
      return "model download";
    case "encoder":
      return "Core ML encoder download";
    case "install":
      return "installation";
  }
}

function capitalize(text: string): string {
  return `${text[0].toUpperCase()}${text.slice(1)}`;
}

/** Adds jobs to the background queue and says so in a toast. */
export async function addToQueue(
  settings: Settings,
  jobs: { title: string; spec: JobSpec }[],
  showQueue?: () => void,
): Promise<Job[]> {
  const added = enqueue(settings, jobs);
  refreshMenuBar();
  const nouns = new Set(jobs.map((job) => jobNoun(job.spec)));
  const noun = nouns.size === 1 ? [...nouns][0] : "job";
  await showToast({
    style: Toast.Style.Success,
    title:
      jobs.length === 1
        ? `${capitalize(noun)} added to the queue`
        : `${jobs.length} ${noun}s added to the queue`,
    message: "The queue keeps running when you close Raycast.",
    primaryAction: showQueue
      ? { title: "Show Queue", onAction: showQueue }
      : undefined,
  });
  return added;
}

export function fileJobs(
  paths: string[],
  options: TranscriptionOptions,
): { title: string; spec: JobSpec }[] {
  return paths.map((path) => ({
    title: basename(path),
    spec: { kind: "file", path, options },
  }));
}

/**
 * The queue, read again every second. `onFinish` is called for jobs that
 * finish while it is shown.
 */
export function useQueue(settings: Settings, onFinish?: (job: Job) => void) {
  const folder = queueFolder(settings);
  const [jobs, setJobs] = useState(() => readJobs(folder));
  const last = useRef(JSON.stringify(jobs));
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    let restarted = 0;
    const timer = setInterval(() => {
      const next = readJobs(folder);
      const text = JSON.stringify(next);
      if (text === last.current) return;
      const previous = new Map(
        (JSON.parse(last.current) as Job[]).map((job) => [job.id, job]),
      );
      last.current = text;
      setJobs(next);
      for (const job of next)
        if (!isActive(job) && previous.get(job.id)?.status === "running")
          finish.current?.(job);
      if (
        next.some((job) => job.status === "queued") &&
        !workerProcess(folder) &&
        Date.now() - restarted > 10_000
      ) {
        restarted = Date.now();
        startWorker(folder);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [folder]);

  return {
    folder,
    jobs,
    refresh() {
      const next = readJobs(folder);
      last.current = JSON.stringify(next);
      setJobs(next);
    },
  };
}

export function jobIcon(job: Job): Image.ImageLike {
  switch (job.status) {
    case "running": {
      const percent = job.percent ?? 0;
      return {
        source:
          percent >= 100
            ? Icon.CircleProgress100
            : percent >= 75
              ? Icon.CircleProgress75
              : percent >= 50
                ? Icon.CircleProgress50
                : percent >= 25
                  ? Icon.CircleProgress25
                  : Icon.CircleProgress,
        tintColor: Color.Blue,
      };
    }
    case "queued":
      return Icon.Clock;
    case "done":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  }
}

export function jobSubtitle(job: Job): string {
  switch (job.status) {
    case "running":
      return job.progress || "Starting…";
    case "queued":
      return "Waiting";
    case "done": {
      const saved = job.outputs?.length ?? 0;
      const skipped = job.skipped?.length
        ? `, ${job.skipped.length} skipped`
        : "";
      if (job.spec.kind === "playlist")
        return `${saved} ${saved === 1 ? "subtitle" : "subtitles"} saved${skipped}`;
      if (job.spec.kind === "playlist-media")
        return `${saved} ${job.spec.format.toUpperCase()} ${saved === 1 ? "file" : "files"} saved${skipped}`;
      if (job.spec.kind === "install") return "Installed";
      if (saved === 1 && !skipped && job.outputs)
        return basename(job.outputs[0]);
      return `${saved} ${saved === 1 ? "file" : "files"} saved${skipped}`;
    }
    case "failed":
      return job.error || "Failed";
    default:
      return job.outputs?.length
        ? `Canceled after ${job.outputs.length} saved`
        : "Canceled";
  }
}

function doneTitle(job: Job): string {
  const count = job.outputs?.length ?? 0;
  switch (job.spec.kind) {
    case "playlist":
      return `Subtitles saved for ${job.title}`;
    case "playlist-media":
      return `${job.spec.format.toUpperCase()} saved for ${job.title}`;
    case "media": {
      const format = job.spec.format.toUpperCase();
      return count > 1 ? `${count} ${format} files saved` : `${format} saved`;
    }
    case "images":
      return count > 1 ? `${count} photos saved` : "Photo saved";
    case "model":
    case "encoder":
      return `${job.title} downloaded`;
    case "install":
      return `${job.spec.formulas.join(", ")} installed`;
    default:
      return count > 1
        ? `${count} transcriptions saved`
        : "Transcription saved";
  }
}

/** Whether a job saves audio, video or photos. */
export function savesMedia(job: Job): boolean {
  return job.spec.kind === "media" || job.spec.kind === "images";
}

/** Whether a job's result is a file to open, rather than one only to show in Finder, like a model. */
export function opensResult(job: Job): boolean {
  return !["model", "encoder", "install"].includes(job.spec.kind);
}

/** Whether a job saves transcripts, which can be copied as text. */
export function savesTranscripts(job: Job): boolean {
  return job.spec.kind === "file" || job.spec.kind === "video";
}

/** Copies the text of transcripts or subtitles; several are separated by a blank line. */
export async function copyText(paths: string[], noun = "Transcript") {
  try {
    await Clipboard.copy(
      paths.map((path) => readFileSync(path, "utf8").trim()).join("\n\n") +
        "\n",
    );
    await showToast({
      style: Toast.Style.Success,
      title: paths.length > 1 ? `${noun}s copied` : `${noun} copied`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not copy the ${noun.toLowerCase()}`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export function jobToast(job: Job, showQueue?: () => void) {
  const output = job.folder ?? job.outputs?.[0];
  const outputs = job.outputs ?? [];
  showToast(
    job.status === "done"
      ? {
          style: Toast.Style.Success,
          title: doneTitle(job),
          message: isPlaylist(job) ? jobSubtitle(job) : output,
          primaryAction: !output
            ? undefined
            : savesTranscripts(job)
              ? {
                  title:
                    outputs.length > 1 ? "Copy Transcripts" : "Copy Transcript",
                  shortcut: Keyboard.Shortcut.Common.Copy,
                  onAction: () => copyText(outputs),
                }
              : savesMedia(job) || !opensResult(job)
                ? {
                    title: "Show in Finder",
                    onAction: () => showInFinder(output),
                  }
                : { title: "Open", onAction: () => open(output) },
          secondaryAction:
            output && savesTranscripts(job)
              ? { title: "Open Transcript", onAction: () => open(output) }
              : undefined,
        }
      : job.status === "failed"
        ? {
            style: Toast.Style.Failure,
            title: `${capitalize(jobNoun(job.spec))} failed: ${job.title}`,
            message: job.error,
            primaryAction:
              errorAction(job.error) ??
              (showQueue
                ? { title: "Show Queue", onAction: showQueue }
                : undefined),
          }
        : { style: Toast.Style.Success, title: `Canceled ${job.title}` },
  );
}

/**
 * Running, queued and finished jobs, with actions to cancel, retry and open
 * results. `onFinish` is called for jobs that finish while the list is shown.
 */
export function QueueList({
  settings,
  onFinish,
}: {
  settings: Settings;
  onFinish?: (job: Job) => void;
}) {
  const { folder, jobs, refresh } = useQueue(settings, onFinish);
  const active = jobs.filter(isActive);
  const finished = jobs.filter((job) => !isActive(job));

  const cancelAll = (
    <Action
      title="Cancel All"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
      onAction={() => {
        active.forEach((job) => cancelJob(folder, job));
        refresh();
      }}
    />
  );
  const clearFinished = (
    <Action
      title="Clear Finished"
      icon={Icon.Trash}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
      onAction={() => {
        finished.forEach((job) => removeJob(folder, job));
        refresh();
      }}
    />
  );

  const item = (job: Job) => {
    const outputs = isPlaylist(job) ? [] : (job.outputs ?? []);
    const output = outputs[0];
    const savedFolder = job.folder;
    const source = job.spec.kind === "file" ? job.spec.path : undefined;
    const elapsed =
      job.startedAt &&
      formatDuration(((job.finishedAt ?? Date.now()) - job.startedAt) / 1000);
    return (
      <List.Item
        key={job.id}
        title={job.title}
        subtitle={jobSubtitle(job)}
        icon={jobIcon(job)}
        accessories={[
          ...(job.status === "running" && job.percent !== undefined
            ? [{ tag: { value: `${job.percent}%`, color: Color.Blue } }]
            : []),
          ...(elapsed && job.status !== "queued"
            ? [{ text: elapsed, tooltip: "Time taken" }]
            : []),
          ...(job.finishedAt ? [{ date: new Date(job.finishedAt) }] : []),
        ]}
        actions={
          <ActionPanel>
            {isActive(job) ? (
              <ActionPanel.Section>
                <Action
                  title={
                    job.status === "queued"
                      ? "Remove from Queue"
                      : jobNoun(job.spec) === "transcription"
                        ? "Cancel Transcription"
                        : "Cancel Download"
                  }
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => {
                    cancelJob(folder, job);
                    refresh();
                  }}
                />
                {active.length > 1 && cancelAll}
              </ActionPanel.Section>
            ) : (
              <ActionPanel.Section>
                {output && savesMedia(job) && (
                  <>
                    <Action.Open title="Open File" target={output} />
                    <Action.ShowInFinder path={output} />
                  </>
                )}
                {output && !opensResult(job) && (
                  <Action.ShowInFinder path={output} />
                )}
                {output && savesTranscripts(job) && (
                  <>
                    <Action.Open title="Open Transcript" target={output} />
                    <Action.ShowInFinder path={output} />
                    <Action
                      title={
                        outputs.length > 1
                          ? "Copy Transcripts"
                          : "Copy Transcript"
                      }
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                      onAction={() => copyText(outputs)}
                    />
                  </>
                )}
                {savedFolder && (
                  <>
                    <Action.Open title="Open Folder" target={savedFolder} />
                    <Action.ShowInFinder path={savedFolder} />
                  </>
                )}
                {job.skipped && job.skipped.length > 0 && (
                  <Action.CopyToClipboard
                    title="Copy Skipped Videos"
                    content={job.skipped
                      .map((video) => `${video.title}: ${video.reason}`)
                      .join("\n")}
                  />
                )}
                {(job.status !== "done" || isPlaylist(job)) && (
                  <Action
                    title={
                      job.status === "done"
                        ? "Download New Videos"
                        : "Try Again"
                    }
                    icon={Icon.RotateClockwise}
                    onAction={() => {
                      retryJob(settings, job);
                      removeJob(folder, job);
                      refreshMenuBar();
                      refresh();
                    }}
                  />
                )}
                {job.error && (
                  <Action.CopyToClipboard
                    title="Copy Error"
                    content={job.error}
                  />
                )}
                <Action
                  title="Remove from List"
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => {
                    removeJob(folder, job);
                    refresh();
                  }}
                />
                {clearFinished}
              </ActionPanel.Section>
            )}
            {source && (
              <ActionPanel.Section>
                <Action.ShowInFinder
                  title="Show Original in Finder"
                  path={source}
                />
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List navigationTitle="Queue">
      <List.EmptyView
        icon={Icon.Waveform}
        title="Nothing in the queue"
        description="Transcriptions and downloads you start appear here. They keep running when you close Raycast."
      />
      <List.Section title="Running">
        {jobs.filter((job) => job.status === "running").map(item)}
      </List.Section>
      <List.Section
        title="Queued"
        subtitle={
          jobs.some((job) => job.status === "queued")
            ? `${jobs.filter((job) => job.status === "queued").length}`
            : undefined
        }
      >
        {jobs.filter((job) => job.status === "queued").map(item)}
      </List.Section>
      <List.Section title="Finished">{finished.map(item)}</List.Section>
    </List>
  );
}
