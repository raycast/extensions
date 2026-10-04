import { describe, it, expect, vi } from "vitest";
import { DownloadSession, SPEED_SMOOTHING_MS, stagesFor } from "../src/lib/download-session";

const init = { kind: "video" as const, url: "https://example.com/v", folder: "/out" };
const progress = (downloadedBytes: number, totalBytes: number, speed: number) => ({
  type: "progress" as const,
  progress: { downloadedBytes, totalBytes, speed, percent: (downloadedBytes / totalBytes) * 100, eta: 1 },
});

describe("stagesFor", () => {
  it("splits video and audio when yt-dlp fetches two streams", () => {
    expect(stagesFor("video", 2).map((s) => s.title)).toEqual(["Prepare", "Video", "Audio", "Merge", "Saved"]);
    expect(stagesFor("video", 1).map((s) => s.key)).toEqual(["prepare", "download", "process", "done"]);
    expect(stagesFor("gallery", 1).map((s) => s.key)).toEqual(["prepare", "download", "done"]);
  });
});

describe("DownloadSession", () => {
  it("walks a two-stream download through its stages", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp({ type: "formats", streams: 2 }, 0);
    session.ytdlp({ type: "stream-start" }, 0);
    expect(session.getSnapshot()).toMatchObject({ streams: 2, streamIndex: 1, stage: "video" });

    session.ytdlp(progress(50, 100, 10), 1000);
    session.ytdlp({ type: "stream-start" }, 2000);
    session.ytdlp(progress(5, 10, 8), 3000);
    expect(session.getSnapshot()).toMatchObject({ stage: "audio", streamIndex: 2, streamBytes: [100, 10] });

    session.ytdlp({ type: "postprocess", step: "merge" }, 4000);
    expect(session.getSnapshot().stage).toBe("process");

    session.succeed({ filePath: "/out/v.mp4", title: "Downloaded" }, 5000);
    expect(session.getSnapshot()).toMatchObject({ status: "done", stage: "done", filePath: "/out/v.mp4" });
  });

  it("treats progress before any Destination line as the first stream", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp(progress(1, 4, 1), 500);
    expect(session.getSnapshot()).toMatchObject({ stage: "download", streamIndex: 1, streamBytes: [4] });
  });

  it("samples speed at most every 250 ms", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp(progress(1, 10, 100), 1000);
    session.ytdlp(progress(2, 10, 200), 1100);
    session.ytdlp(progress(3, 10, 300), 1300);
    expect(session.getSnapshot().speedSamples).toEqual([100, 300]);
  });

  it("smooths the shown speed instead of jumping to every reading", () => {
    expect(SPEED_SMOOTHING_MS).toBe(5000);
    const session = new DownloadSession(init, 0);
    session.ytdlp(progress(100, 10_000, 10), 0);
    expect(session.getSnapshot().speed).toBe(10);

    // A momentary dip 250 ms later barely moves it…
    session.ytdlp(progress(200, 10_000, 2), 250);
    const alpha = 1 - Math.exp(-250 / SPEED_SMOOTHING_MS);
    expect(session.getSnapshot().speed).toBeCloseTo(10 + alpha * (2 - 10));
    expect(session.getSnapshot().speed).toBeGreaterThan(9);

    // …while a sustained change is followed within a few seconds.
    for (let t = 500; t <= 30_000; t += 250) session.ytdlp(progress(300, 10_000, 4), t);
    expect(session.getSnapshot().speed).toBeCloseTo(4, 1);
  });

  it("keeps the raw readings for the chart", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp(progress(1, 100, 10), 1000);
    session.ytdlp(progress(2, 100, 2), 1250);
    expect(session.getSnapshot().speedSamples).toEqual([10, 2]);
  });

  it("derives time left from the remaining bytes and the smoothed speed", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp(progress(400, 1000, 100), 0);
    expect(session.getSnapshot().eta).toBe(6);

    // yt-dlp would now say 0.5 s (500 bytes at 1000 B/s); a speed spike shouldn't collapse the estimate.
    session.ytdlp(progress(500, 1000, 1000), 1000);
    const { speed, eta } = session.getSnapshot();
    expect(eta).toBeCloseTo(500 / speed!);
    expect(eta).toBeGreaterThan(1);
  });

  it("falls back to yt-dlp's ETA when the size is unknown", () => {
    const session = new DownloadSession(init, 0);
    session.ytdlp({ type: "progress", progress: { downloadedBytes: 100, speed: 50, eta: 42 } }, 0);
    expect(session.getSnapshot().eta).toBe(42);
  });

  it("keeps long charts bounded", () => {
    const session = new DownloadSession(init, 0);
    for (let i = 1; i <= 1000; i++) session.ytdlp(progress(i, 1000, i), i * 1000);
    expect(session.getSnapshot().speedSamples.length).toBeLessThanOrEqual(240);
  });

  it("records counters and appends the final count on success", () => {
    const session = new DownloadSession({ ...init, kind: "gallery" }, 0);
    session.count(1, 1000);
    session.count(2, 1100);
    session.succeed({}, 2000);
    expect(session.getSnapshot()).toMatchObject({ items: 2, itemSamples: [1, 2], status: "done" });
  });

  it("marks a cancel apart from a failure", () => {
    const failed = new DownloadSession(init, 0);
    failed.fail({ title: "Download Failed", message: "boom" }, 10);
    expect(failed.getSnapshot()).toMatchObject({ status: "failed", resultMessage: "boom", finishedAt: 10 });

    const cancelled = new DownloadSession(init, 0);
    cancelled.fail({ cancelled: true }, 10);
    expect(cancelled.getSnapshot().status).toBe("cancelled");
  });

  it("routes Stop to the runner only while running", () => {
    const session = new DownloadSession(init, 0);
    const abort = vi.fn();
    expect(session.canStop).toBe(false);
    session.onStop(abort);
    expect(session.canStop).toBe(true);
    session.stop();
    session.succeed({});
    session.stop();
    expect(abort).toHaveBeenCalledTimes(1);
  });

  it("notifies right away on stage changes and throttles plain progress", () => {
    vi.useFakeTimers();
    try {
      const session = new DownloadSession(init, 0);
      const listener = vi.fn();
      session.subscribe(listener);

      session.ytdlp({ type: "stream-start" }, 0);
      expect(listener).toHaveBeenCalledTimes(1);

      session.ytdlp(progress(1, 10, 1), 10);
      session.ytdlp(progress(2, 10, 1), 20);
      expect(listener).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(200);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(session.getSnapshot().downloadedBytes).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
