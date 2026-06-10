import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

import { spawn } from "node:child_process";
import {
  buildThumbnailArgs,
  buildVideoDownloadArgs,
  extractDumpJson,
  isLiveStream,
  runVideoDownload,
} from "../src/lib/ytdlp";

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter; kill: () => void };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn(() => child.emit("close", null));
  return child;
}

describe("buildVideoDownloadArgs", () => {
  const base = { url: "https://example.com/v", outputTemplate: "/out/%(title)s.%(ext)s", ffmpegPath: "/ff" };

  it("extracts audio with the requested format (mp3) without downloading the video streams", () => {
    // `--format bestaudio/best` keeps yt-dlp from fetching its default best
    // video+audio just to strip the audio back out; `/best` covers sites with
    // no audio-only stream.
    expect(buildVideoDownloadArgs({ ...base, format: "bestaudio#mp3" })).toEqual([
      "-o",
      "/out/%(title)s.%(ext)s",
      "--ffmpeg-location",
      "/ff",
      "--no-playlist",
      "--format",
      "bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--progress",
      "--newline",
      "--print",
      "after_move:THE-DOWNLOADER-FILEPATH:%(filepath)s",
      "https://example.com/v",
    ]);
  });

  it("extracts audio as m4a when requested", () => {
    const args = buildVideoDownloadArgs({ ...base, format: "bestaudio#m4a" });
    expect(args).toContain("--extract-audio");
    expect(args[args.indexOf("--audio-format") + 1]).toBe("m4a");
  });

  it("extracts audio as opus when requested", () => {
    const args = buildVideoDownloadArgs({ ...base, format: "bestaudio#opus" });
    expect(args[args.indexOf("--audio-format") + 1]).toBe("opus");
  });

  it("downloads and remuxes (not re-encodes) video into the requested container", () => {
    // --merge-output-format remuxes the merged streams into the container with
    // no transcode. The old --recode-video forced a full, slow re-encode that
    // tripped the idle watchdog and left a half-written file behind.
    expect(buildVideoDownloadArgs({ ...base, format: "bestvideo+bestaudio/best#mp4" })).toEqual([
      "-o",
      "/out/%(title)s.%(ext)s",
      "--ffmpeg-location",
      "/ff",
      "--no-playlist",
      "--format",
      "bestvideo+bestaudio/best",
      "--merge-output-format",
      "mp4",
      "--progress",
      "--newline",
      "--print",
      "after_move:THE-DOWNLOADER-FILEPATH:%(filepath)s",
      "https://example.com/v",
    ]);
  });

  it("passes --no-playlist so a watch?v=…&list=… URL downloads only the inspected video", () => {
    // fetchVideoInfo probes with --no-playlist; without it here, the form
    // showed one video's title and then downloaded the entire playlist.
    expect(buildVideoDownloadArgs({ ...base, format: "bestaudio#mp3" })).toContain("--no-playlist");
    expect(buildVideoDownloadArgs({ ...base, format: "best#mp4" })).toContain("--no-playlist");
  });

  it("adds the deno JS runtime when denoPath is given", () => {
    const args = buildVideoDownloadArgs({ ...base, format: "bestaudio#mp3", denoPath: "/deno" });
    expect(args[args.indexOf("--js-runtimes") + 1]).toBe("deno:/deno");
  });
});

describe("runVideoDownload", () => {
  const options = {
    url: "https://example.com/v",
    format: "bestvideo+bestaudio/best#mp4",
    outputTemplate: "/out/%(title)s.%(ext)s",
    ffmpegPath: "/ff",
  };

  it("reports progress and resolves with the tagged filepath", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const onProgress = vi.fn();
    const promise = runVideoDownload("/yt-dlp", options, onProgress);

    child.stdout.emit("data", Buffer.from("[download]  42.0% of 10.00MiB\n"));
    child.stdout.emit("data", Buffer.from("THE-DOWNLOADER-FILEPATH:/out/My Video.mp4\n"));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ filePath: "/out/My Video.mp4" });
    expect(onProgress).toHaveBeenCalledWith(42);
  });

  it("ignores untagged path-like lines (e.g. post-processor [ExtractAudio] Destination) — they no longer overwrite the real after_move filepath", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runVideoDownload("/yt-dlp", options, vi.fn());

    // Real-world yt-dlp sequence: post-processor lines print absolute paths
    // BEFORE the after_move tag. The old logic kept the last `/`-prefixed
    // line, so the intermediate path won. With the tag, only the tagged line
    // counts.
    child.stdout.emit("data", Buffer.from("[ExtractAudio] Destination: /out/My Video.intermediate.opus\n"));
    child.stdout.emit("data", Buffer.from("Deleting original file /out/My Video.webm (pass -k to keep)\n"));
    child.stdout.emit("data", Buffer.from("THE-DOWNLOADER-FILEPATH:/out/My Video.mp3\n"));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ filePath: "/out/My Video.mp3" });
  });

  it("parses progress from \\r-rewritten updates (yt-dlp's pipe output without --newline)", async () => {
    // Even with --newline passed, stay robust to carriage-return redraws: on a
    // pipe yt-dlp's MultilinePrinter separates progress updates with bare \r.
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const onProgress = vi.fn();
    const promise = runVideoDownload("/yt-dlp", options, onProgress);

    child.stdout.emit("data", Buffer.from("\r[download]  10.0% of 10.00MiB\r[download]  55.0% of 10.00MiB"));
    child.stdout.emit("data", Buffer.from("\r[download] 100.0% of 10.00MiB\n"));
    child.stdout.emit("data", Buffer.from("THE-DOWNLOADER-FILEPATH:/out/My Video.mp4\n"));
    child.emit("close", 0);

    await expect(promise).resolves.toEqual({ filePath: "/out/My Video.mp4" });
    expect(onProgress).toHaveBeenCalledWith(10);
    expect(onProgress).toHaveBeenCalledWith(55);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it("rejects with the stderr text on a non-zero exit", async () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    const promise = runVideoDownload("/yt-dlp", options, vi.fn());

    child.stderr.emit("data", Buffer.from("ERROR: Video unavailable"));
    child.emit("close", 1);

    await expect(promise).rejects.toThrow("ERROR: Video unavailable");
  });

  it("closes stdin so yt-dlp cannot hang on an interactive prompt (2FA, cookie passphrase, etc.)", () => {
    const child = fakeChild();
    (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

    runVideoDownload("/yt-dlp", options, vi.fn());

    expect(spawn).toHaveBeenCalledWith(
      "/yt-dlp",
      expect.any(Array),
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("kills yt-dlp and rejects when no output arrives within options.idleMs", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      (spawn as ReturnType<typeof vi.fn>).mockReturnValueOnce(child);

      const promise = runVideoDownload("/yt-dlp", { ...options, idleMs: 5_000 }, vi.fn());
      const assertion = expect(promise).rejects.toThrow(/no output|stuck|killed/i);

      // yt-dlp prints an extractor selection line, then hangs.
      child.stdout.emit("data", Buffer.from("[youtube] Extracting video info...\n"));
      await vi.advanceTimersByTimeAsync(6_000);

      await assertion;
      expect(child.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("extractDumpJson", () => {
  const json = JSON.stringify({ title: "Hello", duration: 42, formats: [] });

  it("parses a clean JSON-only stdout", () => {
    expect(extractDumpJson(json)).toMatchObject({ title: "Hello" });
  });

  it("skips a [debug] line emitted before the JSON", () => {
    expect(extractDumpJson(`[debug] 2026-05-21 12:00:00 loading plugin\n${json}`)).toMatchObject({ title: "Hello" });
  });

  it("skips a [warning] line emitted before the JSON", () => {
    expect(extractDumpJson(`[youtube] WARNING: Falling back to web client\n${json}`)).toMatchObject({ title: "Hello" });
  });

  it("skips multiple noise lines before the JSON", () => {
    const noisy = ["[debug] foo", "[warning] bar", "[info] baz", json].join("\n");
    expect(extractDumpJson(noisy)).toMatchObject({ title: "Hello" });
  });

  it("parses pretty-printed (multi-line) JSON, including a noise line before it", () => {
    const pretty = JSON.stringify({ title: "Hello", formats: [{ ext: "mp4" }] }, null, 2);
    expect(extractDumpJson(`[debug] header\n${pretty}`)).toMatchObject({ title: "Hello" });
  });

  it("parses JSON whose opening brace is indented (leading whitespace on the first JSON line)", () => {
    expect(extractDumpJson(`   ${json}`)).toMatchObject({ title: "Hello" });
  });

  it("throws a clear error when stdout contains no JSON object", () => {
    expect(() => extractDumpJson("[error] Sign in to confirm you're not a bot")).toThrow(/no JSON metadata/);
  });

  it("throws a clear error on empty stdout", () => {
    expect(() => extractDumpJson("")).toThrow(/no JSON metadata/);
  });
});

describe("isLiveStream", () => {
  const video = (live_status?: string | null) => ({ title: "t", duration: 1, formats: [], live_status });

  it("treats a concrete live status as live", () => {
    expect(isLiveStream(video("is_live"))).toBe(true);
    expect(isLiveStream(video("is_upcoming"))).toBe(true);
  });

  it("treats not_live as not live", () => {
    expect(isLiveStream(video("not_live"))).toBe(false);
  });

  it("treats an absent status as not live", () => {
    expect(isLiveStream(video(undefined))).toBe(false);
  });

  it("treats an explicit null status (extractors that emit live_status: null) as not live", () => {
    expect(isLiveStream(video(null))).toBe(false);
  });
});

describe("buildThumbnailArgs", () => {
  it("builds args that fetch only the thumbnail image", () => {
    expect(buildThumbnailArgs({ url: "https://example.com/v", outputTemplate: "/out/%(title)s.%(ext)s" })).toEqual([
      "--write-thumbnail",
      "--skip-download",
      "--no-playlist",
      "-o",
      "/out/%(title)s.%(ext)s",
      "https://example.com/v",
    ]);
  });
});
