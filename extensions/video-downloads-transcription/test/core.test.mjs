import { createRequire } from "node:module";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

const execFileAsync = promisify(execFile);

const require = createRequire(import.meta.url);
const temporary = mkdtempSync(join(tmpdir(), "raycast-core-test-"));
const compiled = join(temporary, "core.cjs");
require("esbuild").buildSync({
  stdin: {
    contents:
      'export * from "./src/core"; export * from "./src/whisper"; export * from "./src/whisper-server"; export * from "./src/dictation"; export * from "./src/dictation-appearance"; export * from "./src/updates"; export * from "./src/playlists"; export { queueSummary } from "./src/jobs"; export * from "./src/models"; export * from "./src/setup";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: compiled,
  bundle: true,
  platform: "node",
  format: "cjs",
});
const core = require(compiled);
process.on("exit", () => rmSync(temporary, { recursive: true, force: true }));

test("normalizes common YouTube URL forms and rejects other hosts", () => {
  assert.equal(
    core.youtubeUrl("https://youtu.be/jNQXAC9IVRw?t=3"),
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  );
  assert.equal(
    core.youtubeUrl("https://www.youtube.com/shorts/jNQXAC9IVRw"),
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  );
  assert.throws(() =>
    core.youtubeUrl("https://youtube.com.evil.test/watch?v=jNQXAC9IVRw"),
  );
  assert.throws(() => core.youtubeUrl("file:///etc/passwd"));
});

test("accepts YouTube links without a scheme", () => {
  assert.equal(core.youtubeId("youtu.be/jNQXAC9IVRw"), "jNQXAC9IVRw");
  assert.equal(
    core.youtubeUrl(" m.youtube.com/watch?v=jNQXAC9IVRw&list=PL1 "),
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  );
  assert.equal(core.isYoutubeUrl("hello youtu.be/jNQXAC9IVRw"), false);
  assert.equal(core.isYoutubeUrl("https://vimeo.com/1"), false);
  assert.equal(
    core.mediaUrl("youtu.be/jNQXAC9IVRw?si=abc"),
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  );
  assert.equal(core.mediaUrl("https://vimeo.com/1"), "https://vimeo.com/1");
});

test("detects pasted YouTube links but not typed characters", () => {
  const link = "https://youtu.be/jNQXAC9IVRw?si=abc";
  assert.equal(core.pastedMediaLink("", link), link);
  assert.equal(core.pastedMediaLink("", ` ${link}\n`), link);
  assert.equal(core.pastedMediaLink(link.slice(0, -1), link), undefined);
  assert.equal(core.pastedMediaLink("", "https://example.com/1"), undefined);
  const other = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  assert.equal(core.pastedMediaLink(link, other), other);
  assert.equal(core.pastedMediaLink(link, link + other), other);
  assert.equal(
    core.pastedMediaLink("https://youtu.be/", "https://youtu.be/jNQXAC9IVRw"),
    "https://youtu.be/jNQXAC9IVRw",
  );
});

test("reads absolute file paths from search text", () => {
  const { homedir } = require("node:os");
  assert.equal(core.localPath(" /Users/me/Neue.m4a "), "/Users/me/Neue.m4a");
  assert.equal(core.localPath("~/Music/a b.mp3"), `${homedir()}/Music/a b.mp3`);
  assert.equal(core.localPath("'/tmp/a b.wav'"), "/tmp/a b.wav");
  assert.equal(core.localPath("/tmp/a\\ b\\ \\(1\\).m4a"), "/tmp/a b (1).m4a");
  assert.equal(core.localPath("file:///tmp/a%20b.mp4"), "/tmp/a b.mp4");
  assert.equal(core.localPath("Music/a.mp3"), undefined);
  assert.equal(core.localPath("https://youtu.be/jNQXAC9IVRw"), undefined);
  assert.equal(core.pastedFilePath("", "/tmp/a.m4a"), "/tmp/a.m4a");
  assert.equal(core.pastedFilePath("/tmp/a.m4", "/tmp/a.m4a"), undefined);
  assert.equal(
    core.pastedFilePath("/Users/me/Neue.m4a", "/Users/me/Other.m4a"),
    "/Users/me/Other.m4a",
  );
  assert.equal(core.pastedFilePath("", "serbian"), undefined);
});

test("recognizes WAV files whisper.cpp can read without conversion", () => {
  const wav = (channels, sampleRate, bits, extra = 0) => {
    const header = Buffer.alloc(44 + extra);
    header.write("RIFF", 0, "ascii");
    header.write("WAVE", 8, "ascii");
    let offset = 12;
    if (extra) {
      header.write("LIST", offset, "ascii");
      header.writeUInt32LE(extra - 8, offset + 4);
      offset += extra;
    }
    header.write("fmt ", offset, "ascii");
    header.writeUInt32LE(16, offset + 4);
    header.writeUInt16LE(1, offset + 8);
    header.writeUInt16LE(channels, offset + 10);
    header.writeUInt32LE(sampleRate, offset + 12);
    header.writeUInt16LE(bits, offset + 22);
    return header;
  };
  assert.equal(core.isWhisperWavHeader(wav(1, 16000, 16)), true);
  assert.equal(core.isWhisperWavHeader(wav(1, 16000, 16, 26)), true);
  assert.equal(core.isWhisperWavHeader(wav(2, 16000, 16)), false);
  assert.equal(core.isWhisperWavHeader(wav(1, 44100, 16)), false);
  assert.equal(core.isWhisperWavHeader(Buffer.from("ID3 not a wav")), false);
});

test("parses AVFoundation audio inputs without including video devices", () => {
  const output = [
    "[AVFoundation indev @ 0x1] AVFoundation video devices:",
    "[AVFoundation indev @ 0x1] [0] FaceTime HD Camera",
    "[AVFoundation indev @ 0x1] [1] Capture screen 0",
    "[AVFoundation indev @ 0x1] AVFoundation audio devices:",
    "[AVFoundation indev @ 0x1] [0] MacBook Air Microphone",
    "[AVFoundation indev @ 0x1] [12] Studio Display Microphone",
    "[in#0 @ 0x2] Error opening input: Input/output error",
  ].join("\n");

  assert.deepEqual(core.parseAudioInputDevices(output), [
    { index: 0, name: "MacBook Air Microphone" },
    { index: 12, name: "Studio Display Microphone" },
  ]);
});

test("defaults missing or malformed dictation appearance to bottom right", () => {
  const expected = { position: "bottom-right", offsetX: 0, offsetY: 0 };
  for (const stored of [
    undefined,
    "",
    "not JSON",
    "{",
    "null",
    "true",
    "42",
    '"top-left"',
    "[]",
    "{}",
  ]) {
    assert.deepEqual(core.parseDictationAppearance(stored), expected);
  }
});

test("normalizes individual dictation appearance fields", () => {
  assert.deepEqual(
    core.parseDictationAppearance(
      '{"position":"center","offsetX":25.5,"offsetY":-40}',
    ),
    { position: "center", offsetX: 25.5, offsetY: -40 },
  );
  assert.deepEqual(
    core.parseDictationAppearance(
      '{"position":"unknown","offsetX":-10000,"offsetY":10000}',
    ),
    { position: "bottom-right", offsetX: -10000, offsetY: 10000 },
  );
  assert.deepEqual(
    core.parseDictationAppearance('{"position":"top-left","offsetY":12}'),
    { position: "top-left", offsetX: 0, offsetY: 12 },
  );
  for (const invalid of ["12", null, true, {}, [], 10_001, -10_001]) {
    assert.deepEqual(
      core.parseDictationAppearance(
        JSON.stringify({
          position: "top-center",
          offsetX: invalid,
          offsetY: 12,
        }),
      ),
      { position: "top-center", offsetX: 0, offsetY: 12 },
    );
    assert.deepEqual(
      core.parseDictationAppearance(
        JSON.stringify({
          position: "top-center",
          offsetX: -12,
          offsetY: invalid,
        }),
      ),
      { position: "top-center", offsetX: -12, offsetY: 0 },
    );
  }
  assert.deepEqual(
    core.parseDictationAppearance(
      '{"position":"center-left","offsetX":1e999,"offsetY":-1e999}',
    ),
    { position: "center-left", offsetX: 0, offsetY: 0 },
  );
  assert.deepEqual(
    core.normalizeDictationAppearance({
      position: "center-right",
      offsetX: NaN,
      offsetY: Infinity,
    }),
    { position: "center-right", offsetX: 0, offsetY: 0 },
  );
});

test("parses signed dictation offsets and rejects invalid or excessive values", () => {
  for (const [input, expected] of [
    ["0", 0],
    ["", 0],
    [" \t ", 0],
    [" +17.5 ", 17.5],
    ["-2.5", -2.5],
    ["10000", 10_000],
    ["-10000", -10_000],
  ]) {
    assert.equal(core.parseDictationOffset(input), expected);
  }
  for (const input of [
    "NaN",
    "Infinity",
    "-Infinity",
    "1e999",
    "10000.1",
    "-10000.1",
    "text",
    "10px",
  ]) {
    assert.equal(core.parseDictationOffset(input), undefined);
  }
});

test("places the dictation panel at each of its nine screen positions", () => {
  const screen = { x: 100, y: 200, width: 1000, height: 600 };
  const panel = { width: 128, height: 100 };
  const positions = {
    "top-left": { x: 112, y: 688 },
    "top-center": { x: 536, y: 688 },
    "top-right": { x: 960, y: 688 },
    "center-left": { x: 112, y: 450 },
    center: { x: 536, y: 450 },
    "center-right": { x: 960, y: 450 },
    "bottom-left": { x: 112, y: 212 },
    "bottom-center": { x: 536, y: 212 },
    "bottom-right": { x: 960, y: 212 },
  };
  assert.equal(core.dictationPositions.length, 9);
  for (const { value: position } of core.dictationPositions) {
    const appearance = core.parseDictationAppearance(
      JSON.stringify({ position }),
    );
    assert.equal(appearance.position, position);
    assert.deepEqual(
      core.dictationPanelOrigin(screen, panel, appearance),
      positions[position],
      position,
    );
  }
});

test("moves the dictation panel right and down for positive offsets", () => {
  const screen = { x: 100, y: 200, width: 1000, height: 600 };
  const panel = { width: 128, height: 100 };
  assert.deepEqual(
    core.dictationPanelOrigin(screen, panel, {
      position: "center",
      offsetX: 25,
      offsetY: 40,
    }),
    { x: 561, y: 410 },
  );
  assert.deepEqual(
    core.dictationPanelOrigin(screen, panel, {
      position: "center",
      offsetX: -25,
      offsetY: -40,
    }),
    { x: 511, y: 490 },
  );
});

test("clamps dictation offsets within the screen's visible bounds", () => {
  const screen = { x: 100, y: 200, width: 1000, height: 600 };
  const panel = { width: 128, height: 100 };
  assert.deepEqual(
    core.dictationPanelOrigin(screen, panel, {
      position: "center",
      offsetX: 10_000,
      offsetY: 10_000,
    }),
    { x: 960, y: 212 },
  );
  assert.deepEqual(
    core.dictationPanelOrigin(screen, panel, {
      position: "center",
      offsetX: -10_000,
      offsetY: -10_000,
    }),
    { x: 112, y: 688 },
  );
});

test("places dictation panels on screens with negative coordinates", () => {
  const screen = { x: -1280, y: -900, width: 1280, height: 900 };
  const panel = { width: 128, height: 100 };
  for (const [position, expected] of [
    ["top-left", { x: -1268, y: -112 }],
    ["center", { x: -704, y: -500 }],
    ["bottom-right", { x: -140, y: -888 }],
  ]) {
    assert.deepEqual(
      core.dictationPanelOrigin(screen, panel, {
        position,
        offsetX: 0,
        offsetY: 0,
      }),
      expected,
    );
  }
});

test("reduces dictation panel insets when a screen has little available space", () => {
  const screen = { x: -50, y: 100, width: 100, height: 80 };
  for (const { value: position } of core.dictationPositions) {
    assert.deepEqual(
      core.dictationPanelOrigin(
        screen,
        { width: 80, height: 70 },
        { position, offsetX: 10_000, offsetY: -10_000 },
      ),
      { x: -40, y: 105 },
    );
    assert.deepEqual(
      core.dictationPanelOrigin(
        screen,
        { width: 128, height: 100 },
        { position, offsetX: -10_000, offsetY: 10_000 },
      ),
      { x: -50, y: 100 },
    );
  }
});

test("stops microphone recording immediately with SIGINT", async () => {
  const folder = mkdtempSync(join(temporary, "fake-ffmpeg-"));
  const ffmpeg = join(folder, "ffmpeg");
  const wav = join(folder, "recording.wav");
  writeFileSync(
    ffmpeg,
    String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const target = process.argv.at(-1);
fs.writeFileSync(target, Buffer.alloc(100));
fs.writeFileSync(target + ".pid", String(process.pid));
process.stdin.on("data", (chunk) => fs.appendFileSync(target + ".stdin", chunk));
process.once("SIGINT", () => {
  fs.writeFileSync(target + ".signal", "SIGINT");
  process.exit(255);
});
process.stderr.write("Output #0\nPress [q] to stop\n");
setInterval(() => {}, 1000);
`,
  );
  chmodSync(ffmpeg, 0o755);
  const recording = await core.startMicrophoneRecording(
    wav,
    core.defaultMicrophone,
    { ffmpegPath: ffmpeg },
  );
  const pid = Number(readFileSync(`${wav}.pid`, "utf8"));
  const started = Date.now();
  await Promise.all([recording.stop(), recording.stop()]);
  assert.ok(Date.now() - started < 750);
  assert.equal(readFileSync(`${wav}.signal`, "utf8"), "SIGINT");
  assert.equal(
    existsSync(`${wav}.stdin`)
      ? readFileSync(`${wav}.stdin`, "utf8").includes("q")
      : false,
    false,
  );
  await waitUntil(() => !pidExists(pid));
});

test(
  "force kills a microphone recorder that ignores SIGINT",
  { timeout: 4_000 },
  async () => {
    const folder = mkdtempSync(join(temporary, "stuck-ffmpeg-"));
    const ffmpeg = join(folder, "ffmpeg");
    const wav = join(folder, "recording.wav");
    writeFileSync(
      ffmpeg,
      String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const target = process.argv.at(-1);
fs.writeFileSync(target, Buffer.alloc(100));
fs.writeFileSync(target + ".pid", String(process.pid));
process.on("SIGINT", () => {});
process.stderr.write("Output #0\nPress [q] to stop\n");
setInterval(() => {}, 1000);
`,
    );
    chmodSync(ffmpeg, 0o755);
    const recording = await core.startMicrophoneRecording(
      wav,
      core.defaultMicrophone,
      { ffmpegPath: ffmpeg },
    );
    const pid = Number(readFileSync(`${wav}.pid`, "utf8"));
    await assert.rejects(recording.stop(), /ffmpeg could not record/);
    await waitUntil(() => !pidExists(pid));
  },
);

test("cleans whisper text for insertion", () => {
  assert.equal(
    core.cleanWhisperText("  Hello there.  \r\n\r\n  This   is dictation. \n"),
    "Hello there. This is dictation.",
  );
  assert.equal(core.cleanWhisperText(" \n\t\r\n"), "");
});

test("keeps the warmed whisper server local and enables Silero VAD", () => {
  const arguments_ = core.whisperServerArguments(
    {
      whisper: "/tools/whisper-cli",
      model: "/models/ggml-large-v3-turbo.bin",
      vad: "/models/ggml-silero.bin",
    },
    43210,
    "/private-token",
    "sr",
    250,
    "/private-empty-folder",
  );
  const value = (flag) => arguments_[arguments_.indexOf(flag) + 1];
  assert.equal(value("--host"), "127.0.0.1");
  assert.equal(value("--port"), "43210");
  assert.equal(value("--request-path"), "/private-token");
  assert.equal(value("--language"), "sr");
  assert.equal(value("--best-of"), "5");
  assert.equal(value("--beam-size"), "5");
  assert.equal(value("--public"), "/private-empty-folder");
  assert.equal(value("--vad-model"), "/models/ggml-silero.bin");
  assert.equal(value("--vad-speech-pad-ms"), "250");
  assert.equal(arguments_.includes("--convert"), false);
});

function fakeWhisperServer(mode = "normal") {
  const folder = mkdtempSync(join(temporary, "fake-whisper-"));
  const cli = join(folder, "whisper-cli");
  const server = join(folder, "whisper-server");
  const marker = join(folder, `${mode}.pid`);
  const wav = join(folder, "dictation.wav");
  writeFileSync(cli, "");
  writeFileSync(
    server,
    String.raw`#!/usr/bin/env node
const fs = require("node:fs");
const http = require("node:http");
const args = process.argv.slice(2);
const value = (flag) => args[args.indexOf(flag) + 1];
const port = Number(value("--port"));
const host = value("--host");
const prefix = value("--request-path");
fs.writeFileSync(value("--model"), String(process.pid));
const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === prefix + "/health") {
    response.setHeader("content-type", "application/json");
    if (value("--model").includes("never-ready")) {
      response.statusCode = 503;
      response.end('{"status":"loading model"}');
    } else {
      response.end('{"status":"ok"}');
    }
    return;
  }
  if (request.method === "POST" && request.url === prefix + "/inference") {
    if (value("--model").includes("stalled-inference")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"text":');
      return;
    }
    let bytes = 0;
    request.on("data", (chunk) => { bytes += chunk.length; });
    request.on("end", () => {
      response.setHeader("content-type", "application/json");
      response.end(bytes ? '{"text":"  warmed   dictation.\\n"}' : '{"error":"empty request"}');
    });
    return;
  }
  response.statusCode = 404;
  response.end();
});
server.listen(port, host);
const stop = () => server.close(() => process.exit(0));
process.once("SIGINT", stop);
if (value("--model").includes("ignore-termination"))
  process.on("SIGTERM", () => {});
else
  process.once("SIGTERM", stop);
`,
  );
  chmodSync(server, 0o755);
  writeFileSync(wav, Buffer.alloc(32_044));
  return { cli, marker, wav };
}

function pidExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntil(check, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail("Timed out waiting for child-process cleanup");
}

test("warms one local whisper server and closes it idempotently", async (t) => {
  const fake = fakeWhisperServer();
  const session = core.startWhisperServer(
    { whisper: fake.cli, model: fake.marker },
    "en",
    250,
    { startupTimeoutMs: 2_000, requestTimeoutMs: 2_000, pollIntervalMs: 10 },
  );
  assert.ok(session);
  t.after(() => session.close());
  await session.ready;
  const pid = Number(readFileSync(fake.marker, "utf8"));
  assert.equal(
    await session.transcribe(fake.wav, "en", 250),
    "warmed dictation.",
  );
  await Promise.all([session.close(), session.close()]);
  await waitUntil(() => !pidExists(pid));
});

test("closes a warming server before it can spawn", async () => {
  const fake = fakeWhisperServer();
  const session = core.startWhisperServer(
    { whisper: fake.cli, model: fake.marker },
    "en",
  );
  assert.ok(session);
  await session.close();
  await assert.rejects(session.ready, /Canceled/);
});

test(
  "force kills a whisper server that ignores graceful shutdown",
  { timeout: 5_000 },
  async () => {
    const fake = fakeWhisperServer("ignore-termination");
    const session = core.startWhisperServer(
      { whisper: fake.cli, model: fake.marker },
      "en",
      250,
      { startupTimeoutMs: 2_000, pollIntervalMs: 10 },
    );
    assert.ok(session);
    await session.ready;
    const pid = Number(readFileSync(fake.marker, "utf8"));
    await session.close();
    await waitUntil(() => !pidExists(pid));
  },
);

test("stops a server whose model never becomes ready", async () => {
  const fake = fakeWhisperServer("never-ready");
  const session = core.startWhisperServer(
    { whisper: fake.cli, model: fake.marker },
    "en",
    250,
    { startupTimeoutMs: 100, pollIntervalMs: 10 },
  );
  assert.ok(session);
  await assert.rejects(session.ready, /too long to load/);
  await waitUntil(async () => {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
    return !stdout.includes(fake.marker);
  });
});

test("times out when a whisper response body stalls", async () => {
  const fake = fakeWhisperServer("stalled-inference");
  const session = core.startWhisperServer(
    { whisper: fake.cli, model: fake.marker },
    "en",
    250,
    {
      startupTimeoutMs: 2_000,
      requestTimeoutMs: 100,
      pollIntervalMs: 10,
    },
  );
  assert.ok(session);
  await session.ready;
  await assert.rejects(session.transcribe(fake.wav, "en"), /timed out|abort/i);
  await session.close();
  const pid = Number(readFileSync(fake.marker, "utf8"));
  await waitUntil(() => !pidExists(pid));
});

function fakeWhisperCli() {
  const folder = mkdtempSync(join(temporary, "fake-whisper-cli-"));
  const cli = join(folder, "whisper-cli");
  const marker = join(folder, "guarded-cli.pid");
  writeFileSync(
    cli,
    String.raw`#!/usr/bin/env node
const fs = require("node:fs");
fs.writeFileSync(process.argv[2], String(process.pid));
console.log("ready");
setInterval(() => {}, 1000);
`,
  );
  chmodSync(cli, 0o755);
  return { cli, marker };
}

test(
  "guardian stops the whisper CLI fallback when its parent is killed",
  { timeout: 10_000 },
  async (t) => {
    const fake = fakeWhisperCli();
    const scenario = spawn(
      process.execPath,
      [
        "-e",
        `const core = require(process.argv[1]);
core.runGuardedWhisper(
  process.argv[2],
  [process.argv[3]],
  (line) => console.log(line)
);`,
        compiled,
        fake.cli,
        fake.marker,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    t.after(() => {
      if (scenario.exitCode === null && scenario.signalCode === null)
        scenario.kill("SIGKILL");
    });
    await new Promise((resolve, reject) => {
      let output = "";
      scenario.stdout.setEncoding("utf8");
      scenario.stdout.on("data", (chunk) => {
        output += chunk;
        if (output.includes("ready")) resolve();
      });
      scenario.once("error", reject);
      scenario.once("close", () => {
        if (!output.includes("ready"))
          reject(new Error("Guarded whisper CLI stopped before readiness."));
      });
    });
    const pid = Number(readFileSync(fake.marker, "utf8"));
    scenario.kill("SIGKILL");
    await new Promise((resolve) => scenario.once("close", resolve));
    await waitUntil(async () => {
      if (pidExists(pid)) return false;
      const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
      return !stdout.includes(fake.marker);
    });
  },
);

test(
  "guardian stops the whisper server when its parent is killed",
  { timeout: 10_000 },
  async (t) => {
    const fake = fakeWhisperServer();
    const scenario = spawn(
      process.execPath,
      [
        "-e",
        `const core = require(process.argv[1]);
const session = core.startWhisperServer(
  { whisper: process.argv[2], model: process.argv[3] },
  "en",
  250,
  { startupTimeoutMs: 2000, pollIntervalMs: 10 }
);
if (!session) throw new Error("No session");
session.ready.then(() => {
  console.log("ready");
  setInterval(() => {}, 1000);
});`,
        compiled,
        fake.cli,
        fake.marker,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    t.after(() => {
      if (scenario.exitCode === null && scenario.signalCode === null)
        scenario.kill("SIGKILL");
    });
    await new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      scenario.stdout.setEncoding("utf8");
      scenario.stderr.setEncoding("utf8");
      scenario.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (stdout.includes("ready")) resolve();
      });
      scenario.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      scenario.once("error", reject);
      scenario.once("close", (code, signal) => {
        if (!stdout.includes("ready"))
          reject(
            new Error(
              `Scenario stopped before readiness (${signal ?? code}): ${stderr}`,
            ),
          );
      });
    });
    const pid = Number(readFileSync(fake.marker, "utf8"));
    scenario.kill("SIGKILL");
    await new Promise((resolve) => scenario.once("close", resolve));
    await waitUntil(async () => {
      if (pidExists(pid)) return false;
      const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
      return !stdout.includes(fake.marker);
    });
  },
);

test("preserves selected text when appending dictation", () => {
  assert.equal(
    core.textForInsertion("dictated words", "Keep this selection"),
    "Keep this selection dictated words",
  );
  assert.equal(
    core.textForInsertion("next", "Already spaced "),
    "Already spaced next",
  );
  assert.equal(
    core.textForInsertion(", continued", "Keep this"),
    "Keep this, continued",
  );
  assert.equal(core.textForInsertion("only dictation"), "only dictation");
});

test("maps microphone loudness to visualizer levels", () => {
  assert.equal(core.normalizedAudioLevel(-Infinity), 0);
  assert.equal(core.normalizedAudioLevel(-55), 0);
  assert.equal(core.normalizedAudioLevel(-10), 1);
  assert.ok(core.normalizedAudioLevel(-30) > 0.5);
});

test("lists whisper.cpp languages and formats file sizes", () => {
  assert.equal(core.whisperLanguages.length, 100);
  assert.equal(core.whisperLanguageName("sr"), "Serbian");
  assert.equal(core.defaultWhisperLanguage("serbian (orig), English"), "sr");
  assert.equal(core.defaultWhisperLanguage("", "English"), "en");
  assert.equal(core.defaultWhisperLanguage("Klingon", "auto"), "auto");
  assert.equal(core.whisperLanguageName("auto"), "Detect Automatically");
  assert.equal(core.formatSize(512), "512 bytes");
  assert.equal(core.formatSize(12_345_678), "12 MB");
  assert.equal(core.formatSize(1_624_555_275), "1.6 GB");
});

test("media lookup refuses local file URLs before invoking yt-dlp", async () => {
  await assert.rejects(
    core.inspectMedia("file:///etc/passwd", {}),
    /HTTP or HTTPS/,
  );
});

test("shows readable language names for caption selection", () => {
  assert.equal(core.languageLabel("sr"), "Serbian");
  assert.equal(core.languageLabel("en"), "English");
  assert.equal(core.languageLabel("sr-orig"), "Serbian (Original)");
});

test("favorite language text matches case and original-caption variants", () => {
  const tracks = ["sr", "sr-orig", "serbian (orig)"].map((language) => ({
    language,
    kind: "automatic",
    formats: ["vtt"],
  }));
  for (const track of tracks) {
    assert.equal(core.favoriteScore(track, "Serbian"), 100);
    assert.equal(core.favoriteScore(track, "serbian (orig)"), 100);
  }
  assert.ok(core.favoriteScore(tracks[0], "srbn") >= 30);
  assert.deepEqual(core.favoriteLanguageTerms("Serbian, English;de\nfr"), [
    "Serbian",
    "English",
    "de",
    "fr",
  ]);
});

test("ranks favorite language matches first and suggests close matches", () => {
  const languages = [
    { code: "en", name: "English" },
    { code: "sr", name: "Serbian" },
    { code: "hr", name: "Croatian" },
  ];
  const names = (language) => [language.code, language.name];
  assert.deepEqual(
    core
      .rankFavorites(languages, names, "croatian, serbian (orig)")
      .favorites.map((language) => language.code),
    ["hr", "sr"],
  );
  const fuzzy = core.rankFavorites(languages, names, "srbian");
  assert.deepEqual(fuzzy.favorites, []);
  assert.deepEqual(
    fuzzy.suggestions.map((language) => language.code),
    ["sr"],
  );
});

test("identifies creator and automatic language tracks and ignores live chat", () => {
  const video = core.parseVideo(
    {
      id: "jNQXAC9IVRw",
      title: "Example",
      subtitles: { sr: [{ ext: "vtt" }], live_chat: [{ ext: "json" }] },
      automatic_captions: { en: [{ ext: "json3" }, { ext: "vtt" }] },
    },
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  );
  assert.deepEqual(video.captions, [
    { language: "en", kind: "automatic", formats: ["json3", "vtt"] },
    { language: "sr", kind: "manual", formats: ["vtt"] },
  ]);
});

test("reads thumbnail, channel, duration and upload date for the preview", () => {
  const video = core.parseVideo(
    {
      id: "dQw4w9WgXcQ",
      title: "Example",
      thumbnail: "https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/maxresdefault.webp",
      uploader: "Uploader",
      duration: 213,
      upload_date: "20091025",
    },
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );
  assert.equal(
    video.thumbnail,
    "https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/maxresdefault.webp",
  );
  assert.equal(video.channel, "Uploader");
  assert.equal(video.uploadDate, "2009-10-25");
  assert.equal(core.formatDuration(video.duration), "3:33");
  assert.equal(core.formatDuration(3723), "1:02:03");
  assert.equal(
    core.youtubeThumbnail("https://youtu.be/dQw4w9WgXcQ"),
    "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  );
  assert.equal(
    core.parseVideo(
      { id: "x", title: "x", thumbnail: "file:///etc/passwd" },
      "https://example.com",
    ).thumbnail,
    undefined,
  );
});

test("plain text removes cue timing and adjacent repeated captions", () => {
  const input =
    "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello &amp; welcome\n\n00:00:02.000 --> 00:00:03.000\nHello &amp; welcome\n\n00:00:03.000 --> 00:00:04.000\n<c>Next line</c>\n";
  assert.equal(core.vttToText(input), "Hello & welcome\nNext line\n");
});

test("RAW writes readable repeated cue text without timing as TXT content", () => {
  const input =
    "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n\n00:00:02.000 --> 00:00:03.000\nHello\n\n00:00:03.000 --> 00:00:04.000\n<c>world</c>\n";
  assert.equal(core.rawCaptionText(input, "vtt"), "Hello\nHello\nworld\n");
  assert.equal(core.vttToText(input), "Hello\nworld\n");
});

test("plain text handles rolling captions and blank lines inside cues", () => {
  const input =
    "1\n00:00:01,000 --> 00:00:02,000\n\nHello world\n\n2\n00:00:02,000 --> 00:00:03,000\nworld again\n\n3\n00:00:03,000 --> 00:00:04,000\n\nagain today\n";
  assert.equal(core.vttToText(input), "Hello world\nagain\ntoday\n");
});

test("SRT export removes empty cues and renumbers valid cues", () => {
  const input =
    "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:02,000 --> 00:00:03,000\n  \n\n3\n00:00:03,000 --> 00:00:04,000\n\nWorld\n";
  assert.equal(
    core.cleanSrt(input),
    "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n2\n00:00:03,000 --> 00:00:04,000\nWorld\n",
  );
});

test("names transcripts and knows which models can translate", () => {
  assert.equal(core.transcriptSuffix("sr"), "whisper-Serbian");
  assert.equal(core.transcriptSuffix("sr", true), "whisper-Serbian to English");
  assert.equal(core.transcriptSuffix("auto", true), "whisper-auto to English");
  assert.equal(core.transcriptSuffix("en", true), "whisper-English");
  assert.equal(core.canTranslate("/m/ggml-large-v3-turbo-q5_0.bin"), false);
  assert.equal(core.canTranslate("/m/ggml-large-v3.bin"), true);
  assert.equal(core.modelName("/m/ggml-medium.en.bin"), "medium.en");
  assert.equal(
    core.coreMlEncoder("/m/ggml-large-v3-turbo-q5_0.bin"),
    "/m/ggml-large-v3-turbo-encoder.mlmodelc",
  );
});

test("finds audio and video files in chosen folders", () => {
  const { mkdirSync, writeFileSync } = require("node:fs");
  const root = join(temporary, "media");
  for (const folder of ["Show", "Show/Season 1", "Show/.hidden", "Tool.app"])
    mkdirSync(join(root, folder), { recursive: true });
  for (const file of [
    "Show/Episode 10.mp4",
    "Show/Episode 2.m4a",
    "Show/notes.txt",
    "Show/Season 1/Intro.WAV",
    "Show/.hidden/secret.mp3",
    "Show/.DS_Store",
    "Tool.app/sound.mp3",
    "notes.txt",
  ])
    writeFileSync(join(root, file), "");
  const names = (paths) => paths.map((path) => path.slice(root.length + 1));
  assert.deepEqual(names(core.mediaFiles([join(root, "Show")])), [
    "Show/Episode 2.m4a",
    "Show/Episode 10.mp4",
    "Show/Season 1/Intro.WAV",
  ]);
  assert.deepEqual(
    names(
      core.mediaFiles([
        join(root, "notes.txt"),
        join(root, "Show/Episode 2.m4a"),
        root,
      ]),
    ),
    [
      "notes.txt",
      "Show/Episode 2.m4a",
      "Show/Episode 10.mp4",
      "Show/Season 1/Intro.WAV",
    ],
  );
});

test("summarizes yt-dlp media progress", () => {
  assert.equal(
    core.mediaProgress("[download]  45.7% of   12.34MiB at  2.00MiB/s", "mp4"),
    "Downloading MP4… 45%",
  );
  assert.equal(
    core.mediaProgress('[Merger] Merging formats into "x.mp4"', "mp4"),
    "Merging audio and video…",
  );
  assert.equal(
    core.mediaProgress("[ExtractAudio] Destination: x.mp3", "mp3"),
    "Converting to MP3…",
  );
  assert.equal(
    core.mediaProgress("[youtube] jNQXAC9IVRw: Downloading", "mp3"),
    undefined,
  );
});

test("uses browser sign-in only when chosen and explains sign-in errors", () => {
  const error = (message) => new Error(`yt-dlp failed (1): ERROR: ${message}`);
  const explain = (message, settings = {}) =>
    core.explainYtDlpError(error(message), settings).message;
  assert.match(
    explain("[youtube] x: Sign in to confirm your age."),
    /age-restricted\. To use your YouTube account, choose Firefox or Safari under Browser Sign-In/,
  );
  assert.match(
    explain("[youtube] x: Sign in to confirm your age.", {
      browserCookies: "firefox",
    }),
    /signed in to YouTube in Firefox/,
  );
  assert.match(
    explain("could not find firefox cookies database in /x", {
      browserCookies: "firefox",
    }),
    /couldn't find Firefox's cookies/,
  );
  assert.match(
    explain("[Errno 1] Operation not permitted: '/x/Cookies.binarycookies'", {
      browserCookies: "safari",
    }),
    /Full Disk Access/,
  );
  assert.match(explain("HTTP Error 429: Too Many Requests"), /HTTP Error 429/);
  const canceled = core.canceledError();
  assert.equal(core.explainYtDlpError(canceled, {}), canceled);
});

test("browser sign-in permits only Safari and Firefox, including saved jobs", async () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  assert.deepEqual(
    manifest.preferences
      .find((preference) => preference.name === "browserCookies")
      .data.map((browser) => browser.value),
    ["none", "safari", "firefox"],
  );
  for (const browserCookies of ["safari", "firefox"]) {
    const options = await core.ytDlpOptions({
      ffmpegPath: "/usr/bin/true",
      browserCookies,
    });
    assert.ok(options.includes("--ignore-config"));
    const index = options.indexOf("--cookies-from-browser");
    assert.notEqual(index, -1);
    assert.equal(options[index + 1], browserCookies);
  }
  for (const browserCookies of [
    undefined,
    "none",
    "chrome",
    "brave",
    "edge",
    "chromium",
    "opera",
    "vivaldi",
    "chrome:Default",
    "unknown",
  ]) {
    const settings = { ffmpegPath: "/usr/bin/true", browserCookies };
    const options = await core.ytDlpOptions(settings);
    assert.ok(options.includes("--ignore-config"));
    assert.equal(options.includes("--cookies-from-browser"), false);
    assert.match(
      core.explainYtDlpError(new Error("Private video"), settings).message,
      /choose Firefox or Safari under Browser Sign-In/,
    );
  }
});

test("compares yt-dlp versions and picks the update command", () => {
  const updates = require(compiled);
  assert.equal(updates.compareVersions("2026.08.19", "2026.09.01"), -1);
  assert.equal(updates.compareVersions("2026.9.1", "2026.09.01"), 0);
  assert.equal(updates.compareVersions("2026.09.01.1", "2026.09.01"), 1);
  assert.deepEqual(
    updates.updateCommand(
      "/opt/homebrew/bin/yt-dlp",
      "/opt/homebrew/Cellar/yt-dlp/2026.8.19_1/bin/yt-dlp",
      "#!/opt/homebrew/Cellar/yt-dlp/2026.8.19_1/libexec/bin/python",
    ).args,
    ["upgrade", "yt-dlp"],
  );
  assert.equal(
    updates.updateCommand(
      "/opt/homebrew/bin/yt-dlp",
      "/opt/homebrew/Cellar/yt-dlp/2026.8.19_1/bin/yt-dlp",
      "",
    ).bin,
    "/opt/homebrew/bin/brew",
  );
  assert.equal(
    updates.updateCommand(
      "/u/.local/bin/yt-dlp",
      "/u/.local/pipx/venvs/yt-dlp/bin/yt-dlp",
      "#!/u/.local/pipx/venvs/yt-dlp/bin/python",
    ).display,
    "pipx upgrade yt-dlp",
  );
  assert.equal(
    updates.updateCommand(
      "/usr/local/bin/yt-dlp",
      "/usr/local/bin/yt-dlp",
      "#!/usr/bin/env python3",
    ).display,
    "python3 -m pip install --upgrade yt-dlp",
  );
  assert.deepEqual(
    updates.updateCommand(
      "/usr/local/bin/yt-dlp",
      "/usr/local/bin/yt-dlp",
      "Ïúíþ",
    ).args,
    ["--ignore-config", "-U"],
  );
});

test("recognizes playlist and channel links", () => {
  assert.equal(
    core.youtubeCollectionUrl("youtube.com/playlist?list=PLabc_123-x&si=1"),
    "https://www.youtube.com/playlist?list=PLabc_123-x",
  );
  assert.equal(
    core.youtubeCollectionUrl(
      "https://music.youtube.com/playlist?list=OLAK5uy_x",
    ),
    "https://www.youtube.com/playlist?list=OLAK5uy_x",
  );
  assert.equal(
    core.youtubeCollectionUrl("https://www.youtube.com/@jawed/videos/"),
    "https://www.youtube.com/@jawed/videos",
  );
  assert.equal(
    core.youtubeCollectionUrl("m.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A"),
    "https://www.youtube.com/channel/UC4QobU6STFB0P71PMvOGN5A",
  );
  assert.equal(
    core.youtubeCollectionUrl("https://www.youtube.com/@jawed/community"),
    undefined,
  );
  assert.equal(
    core.youtubeCollectionUrl(
      "https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PL1",
    ),
    undefined,
  );
  assert.equal(core.youtubeCollectionUrl("https://vimeo.com/@x"), undefined);
  assert.equal(
    core.youtubePlaylistOf(
      "https://www.youtube.com/watch?v=jNQXAC9IVRw&list=PLxyz",
    ),
    "https://www.youtube.com/playlist?list=PLxyz",
  );
  assert.equal(
    core.mediaUrl("youtube.com/@jawed"),
    "https://www.youtube.com/@jawed",
  );
  assert.equal(
    core.pastedMediaLink("", "https://www.youtube.com/@jawed"),
    "https://www.youtube.com/@jawed",
  );
  assert.equal(
    core.pastedMediaLink(
      "https://www.youtube.com/@jawe",
      "https://www.youtube.com/@jawed",
    ),
    undefined,
  );
});

test("flattens channel tabs and picks captions for playlist downloads", () => {
  const playlist = core.parsePlaylist(
    {
      id: "@x",
      title: "Channel",
      channel: "Channel",
      entries: [
        {
          _type: "playlist",
          title: "Channel - Videos",
          entries: [
            { id: "aaaaaaaaaaa", title: "One", duration: 61 },
            { id: "bbbbbbbbbbb", title: "Two" },
          ],
        },
        {
          _type: "playlist",
          title: "Channel - Shorts",
          entries: [
            { id: "bbbbbbbbbbb", title: "Two" },
            { id: "ccccccccccc", title: "Short" },
          ],
        },
      ],
    },
    "https://www.youtube.com/@x",
  );
  assert.deepEqual(
    playlist.entries.map((entry) => entry.title),
    ["One", "Two", "Short"],
  );
  assert.equal(
    playlist.thumbnail,
    "https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg",
  );
  const captions = [
    { language: "en", kind: "automatic", formats: ["vtt"] },
    { language: "sr-orig", kind: "automatic", formats: ["vtt"] },
    { language: "sr", kind: "automatic", formats: ["vtt"] },
    { language: "iw", kind: "manual", formats: ["vtt"] },
  ];
  assert.equal(core.pickCaption(captions, "sr", "any").language, "sr-orig");
  assert.equal(core.pickCaption(captions, "sr", "manual"), undefined);
  assert.equal(
    core.pickCaption(
      [...captions, { language: "sr-Latn", kind: "manual", formats: ["vtt"] }],
      "sr",
      "any",
    ).language,
    "sr-Latn",
  );
  assert.equal(core.pickCaption(captions, "he", "manual").language, "iw");
  // English is a translation of the Serbian speech
  assert.equal(core.pickCaption(captions, "en", "any"), undefined);
  assert.equal(core.pickCaption(captions, "en", "translated").language, "en");
  // without an -orig track, automatic captions count as the spoken language
  assert.equal(
    core.pickCaption(
      [{ language: "en", kind: "automatic", formats: ["vtt"] }],
      "en",
      "any",
    ).language,
    "en",
  );
  const files = [
    "One [aaaaaaaaaaa] - sr-orig - auto.srt",
    "Two [bbbbbbbbbbb] - en - RAW.txt",
  ];
  assert.equal(
    core.alreadySaved(files, { id: "aaaaaaaaaaa" }, "sr", "srt"),
    files[0],
  );
  assert.equal(
    core.alreadySaved(files, { id: "aaaaaaaaaaa" }, "sr", "vtt"),
    undefined,
  );
  assert.equal(
    core.alreadySaved(files, { id: "bbbbbbbbbbb" }, "en", "raw"),
    files[1],
  );
  assert.equal(
    core.alreadySaved(files, { id: "bbbbbbbbbbb" }, "en", "txt"),
    undefined,
  );
});

test("summarizes a finished queue", () => {
  const file = (status, error) => ({
    title: "a.m4a",
    status,
    error,
    spec: { kind: "file" },
  });
  assert.equal(
    core.queueSummary([file("done"), file("done")]),
    "2 transcriptions saved",
  );
  assert.equal(
    core.queueSummary([file("failed", "No audio")]),
    "a.m4a: No audio",
  );
  assert.equal(
    core.queueSummary([file("done"), file("failed", "x")]),
    "1 of 2 transcriptions saved, 1 failed",
  );
  assert.equal(core.queueSummary([file("canceled")]), undefined);
  assert.equal(
    core.queueSummary([
      {
        title: "Talks",
        status: "done",
        outputs: ["a", "b"],
        skipped: [{}],
        spec: { kind: "playlist" },
      },
    ]),
    "Talks: subtitles for 2 of 3 videos saved",
  );
  const media = (status) => ({
    title: "Clip",
    status,
    error: "No audio",
    spec: { kind: "media", format: "mp3" },
  });
  assert.equal(
    core.queueSummary([media("done"), media("failed"), file("done")]),
    "1 transcription saved\n1 of 2 downloads saved, 1 failed",
  );
});

test("recognizes links from other video sites", () => {
  assert.equal(
    core.videoSite("https://x.com/nasa/status/1234567890?s=20"),
    "X",
  );
  assert.equal(core.videoSite("twitter.com/i/status/1"), "X");
  assert.equal(core.videoSite("https://x.com/nasa"), undefined);
  assert.equal(
    core.videoSite("https://www.instagram.com/reel/Cop84x6u7CP/?igsh=1"),
    "Instagram",
  );
  assert.equal(core.videoSite("instagram.com/p/BQ0eAlwhDrw"), "Instagram");
  assert.equal(
    core.videoSite("https://www.instagram.com/enbiggen/"),
    undefined,
  );
  assert.equal(core.videoSite("https://vm.tiktok.com/ZMabc123/"), "TikTok");
  assert.equal(core.videoSite("https://www.twitch.tv/shroud"), undefined);
  assert.equal(
    core.videoSite("https://www.bilibili.com/video/BV13x41117TL"),
    "Bilibili",
  );
  assert.equal(core.videoSite("https://example.com/video.mp4"), undefined);
  assert.equal(
    core.mediaUrl("instagram.com/reel/abc/"),
    "https://instagram.com/reel/abc/",
  );
  const reel = "https://www.instagram.com/reel/Cop84x6u7CP/";
  assert.equal(core.pastedMediaLink("", reel), reel);
  assert.equal(core.pastedMediaLink(reel.slice(0, -1), reel), undefined);
  assert.equal(
    core.pastedMediaLink("", "https://example.com/video"),
    undefined,
  );
});

test("explains errors from other sites", () => {
  const explain = (message, settings = {}) =>
    core.explainYtDlpError(
      new Error(`yt-dlp failed (1): ERROR: ${message}`),
      settings,
    ).message;
  assert.match(
    explain(
      "[Instagram] abc: Instagram sent an empty media response. Check if this post is accessible in your browser without being logged-in. If it is not, then use --cookies-from-browser or --cookies",
    ),
    /^Instagram only shows this to signed-in accounts\. To use your Instagram account, choose Firefox or Safari/,
  );
  assert.match(
    explain("[twitter] 1: NSFW tweet requires authentication. Use --cookies", {
      browserCookies: "safari",
    }),
    /^X only shows this to signed-in accounts\. Make sure you're signed in to X in Safari\./,
  );
  assert.match(
    explain("[twitter] 1: Error(s) while querying API: Bad guest token"),
    /^X is limiting downloads/,
  );
  assert.equal(
    explain("[twitter] 1: No video could be found in this tweet"),
    "This post has no video.",
  );
  assert.match(
    explain("Unsupported URL: https://example.com/"),
    /^There's no video yt-dlp can download/,
  );
  assert.match(
    explain(
      "[vimeo] 1: The web client only works when logged-in. Use --cookies",
    ),
    /^Vimeo only shows this/,
  );
});

test("counts the videos in a multi-video post", () => {
  const post = core.parseVideo(
    {
      _type: "playlist",
      id: "1395079556562706435",
      title: "Mr. Chau - Here it is",
      entries: [
        { id: "a", thumbnail: "https://pbs.twimg.com/a.jpg" },
        { id: "b" },
      ],
    },
    "https://x.com/a/status/1395079556562706435",
  );
  assert.equal(post.items, 2);
  assert.equal(post.thumbnail, "https://pbs.twimg.com/a.jpg");
  assert.equal(
    core.parseVideo({ id: "x", title: "t", is_live: true }, "u").isLive,
    true,
  );
  assert.equal(
    core.mediaProgress("[download] Downloading item 2 of 3", "mp4"),
    "Downloading 2 of 3…",
  );
});

test("downloads playlists as audio or video and skips what is saved", () => {
  const playlist = core.parsePlaylist(
    {
      id: "PL1",
      title: "Talks",
      entries: [
        { id: "aaaaaaaaaaa", title: "One" },
        { id: "bbbbbbbbbbb", title: "Live", live_status: "is_live" },
        { id: "ccccccccccc", title: "Soon", live_status: "is_upcoming" },
        { id: "ddddddddddd", title: "Was live", live_status: "was_live" },
      ],
    },
    "https://www.youtube.com/playlist?list=PL1",
  );
  assert.deepEqual(
    playlist.entries.map((entry) => entry.live),
    [undefined, true, true, undefined],
  );
  const files = [
    "One [aaaaaaaaaaa].mp3",
    "One [aaaaaaaaaaa] - whisper-English.txt",
    "Other [ddddddddddd].mp4",
  ];
  assert.deepEqual(
    core.alreadyDownloaded(files, { id: "aaaaaaaaaaa" }, "mp3"),
    ["One [aaaaaaaaaaa].mp3"],
  );
  assert.deepEqual(
    core.alreadyDownloaded(files, { id: "aaaaaaaaaaa" }, "m4a"),
    [],
  );
  assert.equal(
    core.queueSummary([
      {
        title: "Talks",
        status: "done",
        outputs: ["a", "b"],
        skipped: [{}],
        spec: { kind: "playlist-media", format: "mp3" },
      },
    ]),
    "Talks: 2 of 3 videos saved as MP3",
  );
});

test("reads the frontmost tab only from browsers", () => {
  assert.equal(core.isBrowser("com.apple.Safari"), true);
  assert.equal(core.isBrowser("org.mozilla.firefox"), true);
  assert.equal(core.isBrowser("com.tinyspeck.slackmacgap"), false);
  assert.equal(core.isBrowser(undefined), false);
  assert.match(
    core.browserTabScript("com.apple.Safari"),
    /application id "com\.apple\.Safari".*URL of current tab of front window/,
  );
  assert.match(
    core.browserTabScript("company.thebrowser.Browser"),
    /URL of active tab of front window/,
  );
  assert.equal(core.browserTabScript("org.mozilla.firefox"), undefined);
});

test("finds photos in Instagram and X posts", () => {
  const photo = (url) => ({
    formats: [],
    thumbnails: [
      { url: `${url}?small` },
      { url: `${url}`, width: 1080, height: 1350 },
    ],
  });
  const single = core.parseVideo(
    { id: "BsOGulcndj-", title: "Video by egg", ...photo("https://i/1.jpg") },
    "https://www.instagram.com/p/BsOGulcndj-/",
  );
  assert.equal(single.noVideo, true);
  assert.equal(single.title, "Post by egg");
  assert.deepEqual(single.images, [
    { url: "https://i/1.jpg", width: 1080, height: 1350 },
  ]);
  const mixed = core.parseVideo(
    {
      _type: "playlist",
      id: "C1",
      title: "Post by nasa",
      entries: [
        photo("https://i/1.jpg"),
        { formats: [{}], duration: 12 },
        photo("https://i/2.jpg"),
        { formats: [{}], duration: 30 },
      ],
    },
    "u",
  );
  assert.equal(mixed.items, 2);
  assert.equal(mixed.photos, 2);
  assert.equal(mixed.noVideo, undefined);
  assert.equal(mixed.title, "Post by nasa");
  const video = core.parseVideo(
    { id: "x", title: "t", formats: [{}], duration: 5 },
    "u",
  );
  assert.equal(video.images, undefined);

  assert.equal(
    core.xStatusId("https://x.com/TheEllenShow/status/440322224407314432?s=20"),
    "440322224407314432",
  );
  assert.equal(core.xStatusId("https://www.instagram.com/p/abc/"), undefined);
  const post = core.parseXPost(
    {
      id_str: "440322224407314432",
      text: "If only Bradley's arm was longer. Best photo ever. #oscars http://t.co/C9U5NOtGa",
      created_at: "2014-03-03T03:06:13.000Z",
      user: { name: "Ellen", screen_name: "TheEllenShow" },
      mediaDetails: [
        {
          type: "photo",
          media_url_https: "https://pbs.twimg.com/media/BhxWutnCEAAtEQ6.jpg",
          original_info: { width: 1920, height: 1080 },
        },
        { type: "video", media_url_https: "https://pbs.twimg.com/v.jpg" },
      ],
    },
    "https://x.com/TheEllenShow/status/440322224407314432",
  );
  assert.equal(
    post.title,
    "Ellen - If only Bradley's arm was longer. Best photo ever. #oscars",
  );
  assert.deepEqual(post.images, [
    {
      url: "https://pbs.twimg.com/media/BhxWutnCEAAtEQ6.jpg?name=orig",
      width: 1920,
      height: 1080,
    },
  ]);
  assert.equal(post.channel, "@TheEllenShow");
  assert.equal(post.uploadDate, "2014-03-03");
  assert.equal(core.parseXPost({ text: "no id" }, "u"), undefined);
});

test("describes tools, Homebrew output and model downloads", () => {
  assert.equal(
    core.cellarVersion(
      "/opt/homebrew/Cellar/whisper.cpp/1.9.4_1/bin/whisper-cli",
    ),
    "1.9.4",
  );
  assert.equal(
    core.cellarVersion("/Users/me/whisper.cpp/build/bin/x"),
    undefined,
  );
  assert.equal(
    core.brewProgress("==> Pouring ffmpeg--9.0.1.arm64_tahoe.bottle.tar.gz"),
    "Installing ffmpeg…",
  );
  assert.equal(
    core.brewProgress("==> Fetching downloads for: whisper.cpp"),
    "Downloading whisper.cpp…",
  );
  assert.equal(core.brewProgress("==> Caveats"), undefined);
  assert.equal(core.brewProgress("🍺  /opt/homebrew/Cellar/ffmpeg"), undefined);
  assert.equal(
    core.brewError(
      "brew failed (1): ==> Auto-updating Homebrew...\nWarning: No available formula\nError: No formulae or casks found for x.\n",
    ),
    "No formulae or casks found for x.",
  );
  assert.equal(core.baseModelName("large-v3-turbo-q5_0"), "large-v3-turbo");
  assert.equal(core.catalogEncoder("large-v3-q5_0").name, "large-v3");
  assert.equal(core.catalogEncoder("base.en"), undefined);
  assert.equal(
    core.coreMlEncoder("/m/ggml-medium-q5_0.bin"),
    "/m/ggml-medium-encoder.mlmodelc",
  );
  assert.ok(
    core.modelCatalog.every(
      (model) => /^[0-9a-f]{64}$/.test(model.sha256) && model.size > 1e7,
    ),
  );
});
