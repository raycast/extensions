import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateUrl,
  videoChoices,
  audioChoices,
  downloadArgs,
  parseEvent,
} from "../src/media";

test("validates platform hosts without allowing lookalikes or credentials", () => {
  assert.equal(validateUrl(" https://youtu.be/abc "), "https://youtu.be/abc");
  for (const url of [
    "file:///a",
    "https://youtube.com.evil.test/a",
    "https://evil.test/?x=youtube.com",
    "https://user:pass@x.com/a",
    "https://x.com:8443/a",
  ]) {
    assert.throws(() => validateUrl(url));
  }
});
const formats = [
  { format_id: "v1", vcodec: "av1", acodec: "none", height: 1080, ext: "webm" },
  { format_id: "v2", vcodec: "h264", acodec: "aac", height: 720, ext: "mp4" },
  { format_id: "a1", vcodec: "none", acodec: "opus", abr: 128, ext: "webm" },
];
test("only offers real video and audio streams", () => {
  assert.deepEqual(
    videoChoices(formats).map((f) => f.format_id),
    ["v1", "v2"],
  );
  assert.deepEqual(
    audioChoices(formats).map((f) => f.format_id),
    ["a1", "v2"],
  );
});

test("video merging only offers standalone audio; audio extraction also accepts combined tracks", () => {
  assert.deepEqual(
    audioChoices(formats, true).map((f) => f.format_id),
    ["a1"],
  );
  assert.deepEqual(
    audioChoices(formats).map((f) => f.format_id),
    ["a1", "v2"],
  );
});

test("social platforms may omit codec metadata for playable direct videos", () => {
  const direct = [{ format_id: "http-832", height: 720, ext: "mp4" }];
  assert.equal(videoChoices(direct).length, 1);
  assert.equal(audioChoices(direct).length, 1);
  assert.equal(audioChoices(direct, true).length, 0);
});
test("uses explicit streams and safe separate arguments; MP4 is remuxed", () => {
  const args = downloadArgs({
    url: "https://x.com/a",
    mode: "video",
    video: "v1",
    audio: "a1",
    container: "mp4",
    bitrate: "192",
    destination: "C:\\My Videos",
    ffmpeg: "C:\\Tools Space\\ffmpeg.exe",
  });
  assert.equal(args[args.indexOf("-f") + 1], "v1+a1");
  assert.ok(args.includes("C:\\My Videos"));
  assert.ok(args.includes("--no-overwrites"));
  assert.ok(args.includes("--ignore-config"));
  assert.equal(args[args.indexOf("--remux-video") + 1], "mp4");
  assert.deepEqual(args.slice(-2), ["--", "https://x.com/a"]);
});
test("audio-only uses selected source and requested bitrate", () => {
  const args = downloadArgs({
    url: "https://youtu.be/abc",
    mode: "audio",
    video: "",
    audio: "a1",
    container: "mp3",
    bitrate: "192",
    destination: "C:\\Downloads",
    ffmpeg: "ffmpeg.exe",
  });
  assert.equal(args[args.indexOf("-f") + 1], "a1");
  assert.ok(args.includes("192K"));
  assert.ok(args.includes("--extract-audio"));
});
test("parses progress and final output without treating other output as completion", () => {
  assert.deepEqual(
    parseEvent(
      'RC_PROGRESS {"status":"downloading","downloaded_bytes":50,"total_bytes":100,"speed":20,"eta":2}',
    ),
    { type: "progress", percent: 50, speed: 20, eta: 2 },
  );
  assert.deepEqual(parseEvent('RC_FILE "C:\\\\Downloads\\\\a.mp4"'), {
    type: "file",
    path: "C:\\Downloads\\a.mp4",
  });
  assert.equal(parseEvent("[download] done"), undefined);
  assert.equal(parseEvent("RC_PROGRESS invalid"), undefined);
});
