import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import crypto from "node:crypto";
import { detectActivePlayback } from "./lib/probe";
import { clearClipInState, enqueueTask, readClipInState } from "./lib/queue";
import { loadRuntimeConfig } from "./lib/raycast-config";
import { assertReadableVideoSource, mediaIdentity } from "./lib/source-format";
import { runQueue } from "./lib/task-runner";
import { ClipQueueTask } from "./lib/types";

export default async function Command() {
  let supportPath: string;
  try {
    const config = loadRuntimeConfig();
    supportPath = config.supportPath;
    const probe = await detectActivePlayback(config);
    if (!probe) {
      await showHUD("❌ No video is playing");
      return;
    }
    assertReadableVideoSource(probe);

    // A start mark only applies to the video it was set on.
    const savedIn = readClipInState(config.supportPath);
    const markMatches = savedIn?.mediaKey !== undefined && savedIn.mediaKey === mediaIdentity(probe);

    let startSec: number;
    let endSec = probe.positionSec;
    let hint: string;
    if (!savedIn || !markMatches) {
      startSec = Math.max(0, endSec - 15.0);
      hint = savedIn ? "⚡️ Start mark is for another video · Last 15s" : "⚡️ Last 15s";
    } else {
      startSec = savedIn.startSec;
      if (endSec < startSec) [startSec, endSec] = [endSec, startSec];
      hint = `🎬 Duration ${(endSec - startSec).toFixed(1)}s`;
    }

    const task: ClipQueueTask = {
      id: crypto.randomUUID(),
      type: "clip",
      createdAt: Date.now(),
      probe,
      startSec,
      endSec,
      durationSec: Math.max(1.0, endSec - startSec),
      config,
    };
    const { shots, clips } = enqueueTask(config.supportPath, task);
    // Consume the mark only once the clip that used it is safely queued.
    if (markMatches) clearClipInState(config.supportPath);
    await showHUD(`${hint} queued · Queue: ${shots} frames / ${clips} clips`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't export clip" });
    return;
  }
  try {
    await runQueue(supportPath);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't run the task queue" });
  }
}
