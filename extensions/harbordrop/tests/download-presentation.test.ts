import assert from "node:assert/strict";
import test from "node:test";
import { snapshot } from "./fixtures";
import {
  downloadProgress,
  isDownloading,
} from "../src/lib/download-presentation";

test("downloading count excludes queued, paused, finishing, and terminal tasks", () => {
  const task = snapshot().tasks[0];
  const tasks = [
    "pending",
    "downloading",
    "paused",
    "merging",
    "completed",
    "error",
    "cancelled",
  ].map((state) => ({ ...task, state }));
  assert.deepEqual(
    tasks.filter(isDownloading).map((item) => item.state),
    ["downloading"],
  );
});

test("unknown transfer length does not turn default zero into measured progress", () => {
  const task = {
    ...snapshot().tasks[0],
    state: "downloading",
    totalBytes: undefined,
    completedBytes: 1_500_000,
    progress: 0,
    speed: 250_000,
  };
  assert.deepEqual(downloadProgress(task), {
    bytes: "1.5 MB received",
    percentage: undefined,
    speed: "250 KB/s",
  });
  assert.equal(downloadProgress({ ...task, progress: 0.42 }).percentage, "42%");
});

test("finishing does not present transfer completion as merge progress or old speed", () => {
  const task = {
    ...snapshot().tasks[0],
    state: "merging",
    totalBytes: 8_000_000,
    completedBytes: 8_000_000,
    progress: 1,
    speed: 2_000_000,
  };
  assert.deepEqual(downloadProgress(task), {
    bytes: "8 MB / 8 MB",
    percentage: undefined,
    speed: undefined,
  });
  assert.deepEqual(
    downloadProgress({
      ...task,
      state: "downloading",
      completedBytes: 2_000_000,
      progress: 0.25,
    }),
    { bytes: "2 MB / 8 MB", percentage: "25%", speed: "2 MB/s" },
  );
});
