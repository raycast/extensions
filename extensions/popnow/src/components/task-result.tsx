import { Action, ActionPanel, Detail, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { createWriteStream } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getTask, isFinished, TaskAsset, TaskRecord } from "../api";

const FIRST_POLL_MS = 3000;
const MAX_POLL_MS = 15000;
const MAX_POLL_FAILURES = 3;

export function TaskResult({ initial, prompt }: { initial: TaskRecord; prompt: string }) {
  const [task, setTask] = useState<TaskRecord>(initial);
  const [failures, setFailures] = useState(0);
  const delay = useRef(FIRST_POLL_MS);
  const { error, isLoading, revalidate } = usePromise(getTask, [initial.taskId], {
    execute: !isFinished(initial),
    onData: setTask,
    // Failed polls are retried here and reported in the view after the last attempt.
    onError: () => undefined,
  });

  useEffect(() => {
    if (isLoading || isFinished(task)) return;
    const failed = error ? failures + 1 : 0;
    setFailures(failed);
    if (failed >= MAX_POLL_FAILURES) return;
    const timer = setTimeout(() => {
      delay.current = Math.min(delay.current * 1.5, MAX_POLL_MS);
      revalidate();
    }, delay.current);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const pollError = failures >= MAX_POLL_FAILURES ? error?.message : undefined;
  const done = isFinished(task);
  const assets = (task.output?.assets ?? []).filter((asset) => asset.url && !asset.unavailable);
  const failed = done && task.state !== "succeeded";

  return (
    <Detail
      isLoading={!done && !pollError}
      navigationTitle={done ? "Result" : "Generating"}
      markdown={markdown(task, assets, prompt, pollError)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={statusText(task)} />
          {task.model && <Detail.Metadata.Label title="Model" text={task.model} />}
          {(task.costUsd || task.estimatedCostUsd) && (
            <Detail.Metadata.Label
              title={done && task.costUsd ? "Cost" : "Held"}
              text={`$${done && task.costUsd ? task.costUsd : (task.estimatedCostUsd ?? task.costUsd)}`}
            />
          )}
          {assets[0]?.width && assets[0]?.height && (
            <Detail.Metadata.Label title="Size" text={`${assets[0].width} × ${assets[0].height}`} />
          )}
          {assets[0]?.durationSeconds && (
            <Detail.Metadata.Label title="Length" text={`${Math.round(assets[0].durationSeconds)}s`} />
          )}
          <Detail.Metadata.Label title="Task ID" text={task.taskId} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {assets.map((asset, index) => (
            <ActionPanel.Section key={asset.url} title={assets.length > 1 ? `File ${index + 1}` : undefined}>
              <Action title="Save to Downloads" icon={Icon.Download} onAction={() => save(asset, task.taskId, index)} />
              <Action.OpenInBrowser title="Open in Browser" url={asset.url as string} />
              <Action.CopyToClipboard title="Copy Link" content={asset.url as string} />
            </ActionPanel.Section>
          ))}
          <Action.CopyToClipboard title="Copy Task ID" content={task.taskId} />
          {failed && <Action.CopyToClipboard title="Copy Prompt" content={prompt} />}
        </ActionPanel>
      }
    />
  );
}

function statusText(task: TaskRecord): string {
  if (!isFinished(task)) return task.state === "queued" ? "Queued" : "Rendering";
  if (task.state === "succeeded") return "Done";
  return task.state.charAt(0).toUpperCase() + task.state.slice(1);
}

function markdown(task: TaskRecord, assets: TaskAsset[], prompt: string, pollError?: string): string {
  if (pollError) return `## Still waiting\n\nCould not check the task: ${pollError}\n\nTask ID: \`${task.taskId}\``;
  if (!isFinished(task)) {
    return `## Generating\n\n> ${prompt}\n\nImages usually take a few seconds, videos one to three minutes. You can close this view; the task keeps running.`;
  }
  if (task.state !== "succeeded") {
    const reason = task.errorMessage ?? "The model could not finish this request.";
    return `## ${statusText(task)}\n\n${reason}\n\nFailed jobs are refunded automatically.`;
  }
  const parts = assets.map((asset) => {
    // Result URLs are presigned, so any extra query parameter (even Raycast's size hints) breaks the signature.
    if (asset.mime?.startsWith("image/")) return `![Result](${asset.url})`;
    const kind = asset.mime?.startsWith("video/") ? "video" : "file";
    return `## Your ${kind} is ready\n\n> ${prompt}\n\nPress **Enter** to save it to Downloads, or [open the ${kind} in your browser](${asset.url}). The link expires after about 20 minutes; saved files are yours to keep.`;
  });
  if (task.output?.text) parts.push(task.output.text);
  return parts.join("\n\n") || "Done.";
}

function extensionFor(asset: TaskAsset): string {
  const subtype = asset.mime?.split("/")[1]?.split(";")[0];
  if (subtype === "jpeg") return "jpg";
  if (subtype === "quicktime") return "mov";
  if (subtype === "mpeg") return "mp3";
  return subtype ?? "bin";
}

async function save(asset: TaskAsset, taskId: string, index: number) {
  if (!asset.url) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading" });
  try {
    const response = await fetch(asset.url);
    if (!response.ok || !response.body) throw new Error(`Download failed with HTTP ${response.status}`);
    const file = join(homedir(), "Downloads", `popnow-${taskId}${index ? `-${index + 1}` : ""}.${extensionFor(asset)}`);
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(file));
    toast.hide();
    await showHUD(`Saved to ${file.replace(homedir(), "~")}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not save the file" });
  }
}
