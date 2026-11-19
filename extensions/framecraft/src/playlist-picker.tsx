import { Action, ActionPanel, List, showToast, Toast, useNavigation } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { formatHmsDisplay, jellyfinStreamUrl, statePaths } from "./lib/env";
import { deleteHistoryEntry, enqueueTask, listActiveTasks, readQueue, spawnDetachedWorker } from "./lib/queue";
import { useState } from "react";
import { pathToFileURL } from "node:url";
import { previewDiscPlaylist } from "./lib/disc-preview";
import { rememberPlaylist } from "./lib/disc-preference";
import { RuntimeConfig, QueueTask, ScreenshotQueueTask } from "./lib/types";

export default function PlaylistPicker({
  taskId,
  config,
  onSubmitted,
}: {
  taskId: string;
  config: RuntimeConfig;
  onSubmitted: () => void;
}) {
  const { pop } = useNavigation();
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const dir = path.join(statePaths(config.supportPath).projectsDir, taskId);
  let candidates: Array<{ playlist: number; durationSec: number; chapters: number; clips: number }> = [];
  try {
    candidates = JSON.parse(fs.readFileSync(path.join(dir, "playlists.json"), "utf8"));
  } catch {
    /* Prior worker has no candidates. */
  }
  return (
    <List navigationTitle="Confirm the Version You Are Watching" isShowingDetail isLoading={loading}>
      <List.EmptyView title="No candidate versions yet. Retry once to read the disc info" />
      {candidates.map((candidate) => (
        <List.Item
          key={candidate.playlist}
          title={`Playlist ${String(candidate.playlist).padStart(5, "0")}`}
          subtitle={`${formatHmsDisplay(candidate.durationSec)} · ${candidate.chapters} chapters · ${candidate.clips} clips`}
          detail={
            <List.Item.Detail
              markdown={`${previews[candidate.playlist] ? `![Target frame preview](${pathToFileURL(previews[candidate.playlist]).href})\n\n` : "Use the Action Panel to preview the target frame. No need to know the playlist number.\n\n"}Compare this with the frame and total duration shown in your player.\n\n- Duration: ${candidate.durationSec.toFixed(3)} s\n- Chapters: ${candidate.chapters}\n- Clips: ${candidate.clips}\n\nThe player did not report which disc title is selected, so automatic matching is not guaranteed. If you are unsure, do not guess.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Preview Target Frame for This Version"
                onAction={async () => {
                  setLoading(true);
                  try {
                    const task = JSON.parse(
                      fs.readFileSync(path.join(dir, "retry.json"), "utf8"),
                    ) as ScreenshotQueueTask;
                    task.config = config;
                    if (task.probe.itemId)
                      task.probe.mediaTarget = jellyfinStreamUrl(
                        config.jellyfinUrl,
                        config.jellyfinApiKey,
                        task.probe.itemId,
                        task.probe.mediaSourceId,
                      );
                    const image = await previewDiscPlaylist(task, dir, candidate.playlist);
                    setPreviews((p) => ({ ...p, [candidate.playlist]: image }));
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Preview failed",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
              />
              <Action
                title="Remember This Version and Recapture"
                onAction={async () => {
                  try {
                    if (
                      listActiveTasks(config.supportPath).some((state) => state.task.id === taskId) ||
                      readQueue(config.supportPath).some((t) => t.id === taskId)
                    )
                      throw new Error("This task is still processing or queued");
                    const task = JSON.parse(fs.readFileSync(path.join(dir, "retry.json"), "utf8")) as QueueTask;
                    task.config = config;
                    task.probe.playlist = candidate.playlist;
                    if (task.probe.source === "jellyfin-remote" && task.probe.itemId)
                      task.probe.mediaTarget = jellyfinStreamUrl(
                        config.jellyfinUrl,
                        config.jellyfinApiKey,
                        task.probe.itemId,
                        task.probe.mediaSourceId,
                      );
                    rememberPlaylist(config, task.probe, candidate.playlist);
                    enqueueTask(config.supportPath, task);
                    deleteHistoryEntry(config.supportPath, taskId);
                    await spawnDetachedWorker(config);
                    onSubmitted();
                    pop();
                    await showToast({ style: Toast.Style.Success, title: "Submitted with the selected disc version" });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Submission failed",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
