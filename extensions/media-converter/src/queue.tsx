import { useCallback, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, confirmAlert, Alert } from "@raycast/api";
import path from "node:path";
import fs from "node:fs";
import { convertMedia } from "./utils/converter";
import { recordConversionHistory } from "./utils/historyRecording";
import { resolveTargetSizeQuality } from "./utils/targetSize";
import {
  clearFinishedQueueJobs,
  listQueueJobs,
  moveQueueJob,
  patchQueueJob,
  recoverInterruptedQueueJobs,
  removeQueueJob,
  type QueueJob,
} from "./utils/queue";

export default function Command() {
  const [jobs, setJobs] = useState<QueueJob[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const reload = useCallback(async () => setJobs(await listQueueJobs()), []);

  useEffect(() => {
    recoverInterruptedQueueJobs().then(setJobs);
    return () => abortController.current?.abort();
  }, []);

  const runJob = useCallback(
    async (job: QueueJob) => {
      setActiveId(job.id);
      const controller = new AbortController();
      abortController.current = controller;
      await patchQueueJob(job.id, { status: "running", progress: 0, error: undefined, output: undefined });
      await reload();
      const startedAt = Date.now();
      try {
        const quality = job.targetSizeMb
          ? (await resolveTargetSizeQuality(job.input, job.outputFormat, job.quality, job.targetSizeMb, job.trim))
              .quality
          : job.quality;
        const output = await convertMedia(job.input, job.outputFormat, quality, {
          outputDir: job.outputDir,
          stripMetadata: job.stripMetadata,
          trim: job.trim,
          signal: controller.signal,
          onProgress: (progress) => {
            const rounded = Math.floor(progress.percent);
            setJobs(
              (current) => current?.map((item) => (item.id === job.id ? { ...item, progress: rounded } : item)) ?? null,
            );
          },
        });
        await patchQueueJob(job.id, { status: "completed", progress: 100, output, error: undefined });
        try {
          await recordConversionHistory({
            input: job.input,
            output,
            outputFormat: job.outputFormat,
            quality,
            mediaType: job.mediaType,
            trim: job.trim,
            stripMetadata: job.stripMetadata,
            outputDir: job.outputDir,
            durationMs: Date.now() - startedAt,
          });
        } catch (historyError) {
          console.warn("Failed to write queue conversion history:", historyError);
        }
      } catch (error) {
        const cancelled = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
        await patchQueueJob(job.id, {
          status: cancelled ? "cancelled" : "failed",
          error: cancelled ? "Cancelled by user" : String(error),
        });
      } finally {
        abortController.current = null;
        setActiveId(null);
        await reload();
      }
    },
    [reload],
  );

  useEffect(() => {
    if (!jobs || activeId) return;
    const next = jobs.find((job) => job.status === "pending");
    if (next) void runJob(next);
  }, [jobs, activeId, runJob]);

  if (jobs === null) return <List isLoading />;

  return (
    <List searchBarPlaceholder="Search conversion queue">
      {jobs.length === 0 ? (
        <List.EmptyView icon={Icon.Tray} title="Queue is empty" description="Use “Add to Queue” from Convert Media." />
      ) : (
        jobs.map((job) => (
          <List.Item
            key={job.id}
            icon={{ source: statusIcon(job.status), tintColor: statusColor(job.status) }}
            title={path.basename(job.input)}
            subtitle={`${job.outputFormat} · ${statusLabel(job)}`}
            accessories={job.targetSizeMb ? [{ text: `≈ ${job.targetSizeMb} MB` }] : []}
            actions={
              <ActionPanel>
                {job.status === "running" && job.id === activeId && (
                  <Action
                    title="Cancel Job"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={() => abortController.current?.abort()}
                  />
                )}
                {["failed", "cancelled", "interrupted"].includes(job.status) && (
                  <Action
                    title="Retry Job"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      await patchQueueJob(job.id, { status: "pending", progress: 0, error: undefined });
                      await reload();
                    }}
                  />
                )}
                {job.output && fs.existsSync(job.output) && (
                  <>
                    <Action.Open title="Open Output" target={job.output} />
                    <Action.ShowInFinder path={job.output} />
                  </>
                )}
                {job.status !== "running" && (
                  <>
                    <Action
                      title="Move up"
                      icon={Icon.ArrowUp}
                      shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                      onAction={async () => {
                        await moveQueueJob(job.id, -1);
                        await reload();
                      }}
                    />
                    <Action
                      title="Move Down"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                      onAction={async () => {
                        await moveQueueJob(job.id, 1);
                        await reload();
                      }}
                    />
                    <Action
                      title="Remove Job"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        await removeQueueJob(job.id);
                        await reload();
                      }}
                    />
                  </>
                )}
                <Action
                  title="Clear Finished Jobs"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Clear finished queue jobs?",
                        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await clearFinishedQueueJobs();
                      await reload();
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function statusLabel(job: QueueJob): string {
  if (job.status === "running") return `${job.progress}%`;
  if (job.error && ["failed", "interrupted"].includes(job.status)) return `${job.status} · ${job.error}`;
  return job.status;
}

function statusIcon(status: QueueJob["status"]): Icon {
  if (status === "completed") return Icon.CheckCircle;
  if (status === "running") return Icon.CircleProgress;
  if (status === "failed" || status === "interrupted") return Icon.Warning;
  if (status === "cancelled") return Icon.XMarkCircle;
  return Icon.Clock;
}

function statusColor(status: QueueJob["status"]): Color {
  if (status === "completed") return Color.Green;
  if (status === "running") return Color.Blue;
  if (status === "failed" || status === "interrupted") return Color.Red;
  if (status === "cancelled") return Color.Orange;
  return Color.SecondaryText;
}
