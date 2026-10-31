import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeEntries,
  runQueue,
  selectPreset,
  type Preset,
} from "../src/batch";
import { conversionArgs } from "../src/conversion";
import { validateUrl } from "../src/media";

const preset: Preset = {
  mode: "video",
  container: "mp4",
  height: 720,
  bitrate: "192",
  convert: false,
};

test("carousel entries keep their parent URL and distinct playlist positions", () => {
  const post = {
    _type: "multi_video",
    entries: [
      { id: "a", title: "One", formats: [] },
      { id: "b", title: "Two", formats: [] },
    ],
  };
  const entries = normalizeEntries(
    "https://www.instagram.com/p/fixture/",
    post,
  );
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.playlistItem),
    [1, 2],
  );
});
test("playlist preview normalizes YouTube IDs, deduplicates and drops unavailable entries", () => {
  const result = normalizeEntries(
    "https://www.youtube.com/playlist?list=fixture",
    {
      entries: [
        { url: "jNQXAC9IVRw", title: "First" },
        { url: "jNQXAC9IVRw" },
        null,
        { url: "file:///secret" },
      ],
    },
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].url, "https://www.youtube.com/watch?v=jNQXAC9IVRw");
});
test("expanded platform host validation still rejects lookalikes", () => {
  for (const host of [
    "www.tiktok.com",
    "fb.watch",
    "www.reddit.com",
    "vimeo.com",
    "www.twitch.tv",
    "pin.it",
  ])
    assert.ok(validateUrl(`https://${host}/video`));
  assert.throws(() => validateUrl("https://tiktok.com.evil.test/video"));
});
test("batch selects real per-video format IDs under the resolution cap", () => {
  const info = {
    id: "x",
    title: "x",
    formats: [
      { format_id: "4k", height: 2160, vcodec: "av1", acodec: "none" },
      { format_id: "720", height: 720, vcodec: "h264", acodec: "none" },
      { format_id: "a", vcodec: "none", acodec: "aac", abr: 128 },
    ],
  };
  assert.deepEqual(selectPreset(info, preset), { video: "720", audio: "a" });
  assert.throws(
    () => selectPreset(info, { ...preset, height: 360 }),
    /resolution/,
  );
});
test("queue limits concurrency, isolates failures and does not start new items after cancel", async () => {
  let active = 0;
  let maximum = 0;
  const done: number[] = [];
  const failed: number[] = [];
  await runQueue(
    [0, 1, 2, 3, 4],
    3,
    new AbortController().signal,
    async (item) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      if (item === 1) throw new Error("fixture");
      done.push(item);
    },
    (_, i) => failed.push(i),
  );
  assert.equal(maximum, 3);
  assert.deepEqual(failed, [1]);
  assert.equal(done.length, 4);
  const controller = new AbortController();
  const started: number[] = [];
  await runQueue(
    [0, 1, 2],
    1,
    controller.signal,
    async (item) => {
      started.push(item);
      controller.abort();
    },
    () => {},
  );
  assert.deepEqual(started, [0]);
});
test("conversion protects originals and uses compatible codecs without upscaling", () => {
  const args = conversionArgs("C:\\input file.mov", "C:\\output file.mp4", {
    format: "mp4",
    height: 720,
    bitrate: "192",
  });
  assert.ok(args.includes("-n"));
  assert.ok(args.includes("libx264"));
  assert.ok(args.includes("aac"));
  assert.ok(args.includes("scale=-2:trunc(min(720\\,ih)/2)*2"));
  assert.equal(args.at(-1), "C:\\output file.mp4");
  assert.ok(
    conversionArgs("x", "y", {
      format: "mp3",
      height: 0,
      bitrate: "128",
    }).includes("libmp3lame"),
  );
});
