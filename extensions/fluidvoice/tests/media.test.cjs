const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { load } = require("./helpers.cjs");

async function fixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fluidvoice-test-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, "original.mp3");
  await fs.writeFile(input, "entire original media");
  const calls = [];
  const jobs = [];
  const result = { text: "first middle last", confidence: 0.9, sampleCount: 64000000, provider: "test" };
  const { transcribeSource, normalizeSource } = load("utils/media.ts", {
    "./retention": load("utils/retention.ts"),
    "@raycast/api": {
      environment: { supportPath: path.join(directory, "support") },
      getPreferenceValues: () => ({ retainedDownloads: options.keep ?? "0" }),
    },
    "../api/fluidVoice": {
      FluidVoiceAPI: {
        health: async () => {
          if (options.healthError) throw new Error("not connected");
        },
        transcribeFile: async (file) => {
          jobs.push(file);
          if (options.transcriptionError) throw new Error("inference failed");
          assert.equal((await fs.stat(file)).isFile(), true);
          return result;
        },
      },
    },
    "node:util": {
      // Match execFile's custom promisifier, which resolves stdout and stderr together.
      promisify:
        (fn) =>
        (...args) =>
          new Promise((resolve, reject) =>
            fn(...args, (error, stdout, stderr) => (error ? reject(error) : resolve({ stdout, stderr }))),
          ),
    },
    "node:child_process": {
      execFile: (command, args, config, callback) => {
        calls.push({ command, args, config });
        if (command === "ffprobe") {
          if (options.missingTool)
            return callback(Object.assign(new Error("spawn ffprobe ENOENT"), { code: "ENOENT" }));
          callback(
            null,
            JSON.stringify({ streams: options.noAudio ? [] : [{ codec_name: options.codec ?? "mp3" }] }),
            "",
          );
        } else if (command === "ffmpeg") {
          fs.writeFile(args.at(-1), "whole converted media").then(() => callback(null, "", ""), callback);
        } else if (command === "yt-dlp") {
          const destination = path.join(path.dirname(args[args.indexOf("-o") + 1]), "download.mp3");
          fs.writeFile(destination, "entire downloaded media").then(
            () => callback(null, `${destination}\n`, ""),
            callback,
          );
        } else callback(new Error(`Unexpected command ${command}`));
      },
    },
  });
  return { directory, input, calls, jobs, result, transcribeSource, normalizeSource };
}

test("compatible local audio is sent whole in exactly one inference request and is never deleted", async (t) => {
  const f = await fixture(t);
  assert.equal(await f.transcribeSource(f.input), f.result);
  assert.deepEqual(f.jobs, [f.input]);
  assert.deepEqual(
    f.calls.map((call) => call.command),
    ["ffprobe"],
  );
  assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
});

test("unsupported media converts the full file once, without segmentation", async (t) => {
  const f = await fixture(t, { codec: "opus" });
  await f.transcribeSource(f.input);
  assert.equal(f.jobs.length, 1);
  assert.deepEqual(
    f.calls.map((call) => call.command),
    ["ffprobe", "ffmpeg"],
  );
  assert.equal(f.calls[1].args.includes("-ss"), false);
  assert.equal(f.calls[1].args.includes("-t"), false);
  assert.equal(f.calls[1].args.includes("segment"), false);
  assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
});

test("direct media downloads fully and retention zero removes only temporary media", async (t) => {
  const f = await fixture(t);
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async () => {
    const response = new Response("downloaded bytes", { headers: { "Content-Type": "audio/mpeg" } });
    Object.defineProperty(response, "url", { value: "https://example.com/audio.mp3" });
    return response;
  };
  await f.transcribeSource("https://example.com/audio.mp3");
  assert.equal(f.jobs.length, 1);
  assert.equal(
    f.calls.some((call) => call.command === "yt-dlp"),
    false,
  );
  assert.deepEqual(await fs.readdir(path.join(f.directory, "support/media")), []);
  assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
});

test("retention prunes completed jobs and preserves active jobs and original files", async (t) => {
  const f = await fixture(t, { keep: "1", codec: "opus" });
  const media = path.join(f.directory, "support/media");
  for (const name of ["media-old", "media-active"]) await fs.mkdir(path.join(media, name), { recursive: true });
  await fs.writeFile(path.join(media, "media-old/completed.json"), JSON.stringify({ completedAt: 1 }));
  await f.transcribeSource(f.input);
  const remaining = await fs.readdir(media);
  assert.equal(remaining.includes("media-old"), false);
  assert.equal(remaining.includes("media-active"), true);
  assert.equal(remaining.length, 2);
  assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
});

test("failed inference cleans its work folder and preserves the original", async (t) => {
  const f = await fixture(t, { codec: "opus", transcriptionError: true, keep: "5" });
  await assert.rejects(f.transcribeSource(f.input), /inference failed/);
  assert.deepEqual(await fs.readdir(path.join(f.directory, "support/media")), []);
  assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
});

test("player URL is passed as an argument to yt-dlp, without a shell", async (t) => {
  const f = await fixture(t);
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });
  global.fetch = async () => {
    const response = new Response("<html>player</html>", { headers: { "Content-Type": "text/html" } });
    Object.defineProperty(response, "url", { value: "https://example.com/player" });
    return response;
  };
  const source = "https://example.com/player?q=$(touch%20unexpected)&x=`echo`";
  await f.transcribeSource(source);
  const download = f.calls.find((call) => call.command === "yt-dlp");
  assert.equal(download.args.at(-1), source);
  assert.equal(download.args.at(-2), "--");
  assert.equal(download.args.includes("--no-playlist"), true);
  assert.equal(download.config.shell, undefined);
});

test("source normalization accepts file URLs and home paths and rejects invalid input", async (t) => {
  const f = await fixture(t);
  assert.equal(f.normalizeSource('"file:///tmp/audio%20file.mp3"'), "/tmp/audio file.mp3");
  assert.equal(f.normalizeSource("~/Downloads/audio.mp3"), path.join(os.homedir(), "Downloads/audio.mp3"));
  for (const value of ["", "relative.mp3", "ftp://example.com/audio", "https://["])
    assert.throws(() => f.normalizeSource(value), /Enter/);
});

test("invalid retention preferences stop before processing media", async (t) => {
  for (const keep of ["-1", "1.5", "not a number", "99999999999999999999999999"]) {
    const f = await fixture(t, { keep });
    await assert.rejects(f.transcribeSource(f.input), /Downloaded Files to Keep/);
    assert.equal(f.calls.length, 0);
  }
});

test("missing media tools and absent audio produce actionable errors", async (t) => {
  const missing = await fixture(t, { missingTool: true });
  await assert.rejects(missing.transcribeSource(missing.input), /brew install ffmpeg yt-dlp/);
  const silent = await fixture(t, { noAudio: true });
  await assert.rejects(silent.transcribeSource(silent.input), /no audio track/);
});

for (const keep of ["0", "1"]) {
  test(`lowering retention to ${keep} prunes previous downloads on a compatible local-file run`, async (t) => {
    const f = await fixture(t, { keep });
    const media = path.join(f.directory, "support/media");
    for (let index = 0; index < 3; index++) {
      const directory = path.join(media, `media-old-${index}`);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, "completed.json"), JSON.stringify({ completedAt: index + 1 }));
    }
    await f.transcribeSource(f.input);
    assert.deepEqual(await fs.readdir(media), keep === "0" ? [] : ["media-old-2"]);
    assert.deepEqual(f.jobs, [f.input]);
    assert.equal(await fs.readFile(f.input, "utf8"), "entire original media");
  });
}

test("retention never deletes a cached file selected as the current local input", async (t) => {
  const f = await fixture(t, { keep: "0" });
  const directory = path.join(f.directory, "support/media/media-selected");
  await fs.mkdir(directory, { recursive: true });
  const input = path.join(directory, "download.mp3");
  await fs.writeFile(input, "selected media");
  await fs.writeFile(path.join(directory, "completed.json"), JSON.stringify({ completedAt: 1 }));
  await f.transcribeSource(input);
  assert.deepEqual(f.jobs, [input]);
  assert.equal(await fs.readFile(input, "utf8"), "selected media");
});
