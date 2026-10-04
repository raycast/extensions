import { describe, it, expect } from "vitest";
import { downloadHeroSvg, downloadedBytes, heroFrameKey, knownTotalBytes } from "../src/lib/charts";
import { DownloadKind, DownloadSession } from "../src/lib/download-session";

const KINDS: DownloadKind[] = ["video", "audio", "gallery", "spotify", "website", "transcript", "thumbnail"];

function running(kind: DownloadKind) {
  const session = new DownloadSession({ kind, url: "https://example.com/v", folder: "/Users/me/Downloads" }, 0);
  if (kind === "gallery" || kind === "spotify") {
    session.count(3, 1000);
  } else if (kind === "video" || kind === "audio") {
    session.ytdlp({ type: "formats", streams: kind === "video" ? 2 : 1 }, 0);
    session.ytdlp({ type: "stream-start" }, 0);
    session.ytdlp(
      { type: "progress", progress: { downloadedBytes: 5e6, totalBytes: 1e7, speed: 2e6, percent: 50 } },
      500,
    );
  } else {
    session.working();
  }
  return session;
}

describe("downloadHeroSvg", () => {
  for (const kind of KINDS) {
    it(`draws ${kind} downloads in every state without NaN`, () => {
      const states = [running(kind), running(kind), running(kind), running(kind)];
      states[1].succeed({ filePath: "/Users/me/Downloads/file.mp4" }, 9000);
      states[2].fail({ title: "Download Failed", message: "ERROR: Video unavailable" }, 9000);
      states[3].fail({ cancelled: true }, 9000);
      for (const session of states) {
        const markup = downloadHeroSvg(session.getSnapshot(), 9000);
        expect(markup.startsWith("<svg")).toBe(true);
        expect(markup).not.toContain("NaN");
        expect(markup).not.toContain("undefined");
      }
    });
  }

  it("escapes error text from the tools", () => {
    const session = running("video");
    session.fail({ title: "Download Failed", message: `ERROR: <script> & "quotes"` }, 9000);
    const markup = downloadHeroSvg(session.getSnapshot(), 9000);
    expect(markup).toContain("&lt;script&gt; &amp; &quot;quotes&quot;");
    expect(markup).not.toContain("<script>");
  });

  it("shows the live percentage and the stream it belongs to", () => {
    const markup = downloadHeroSvg(running("video").getSnapshot(), 1000);
    expect(markup).toContain(">50%<");
    expect(markup).toContain("video · 10.0 MB");
  });
});

describe("byte totals", () => {
  it("adds finished streams to the one in flight", () => {
    const session = new DownloadSession({ kind: "video", url: "u", folder: "/out" }, 0);
    session.ytdlp({ type: "formats", streams: 2 }, 0);
    session.ytdlp({ type: "stream-start" }, 0);
    session.ytdlp({ type: "progress", progress: { downloadedBytes: 100, totalBytes: 100 } }, 0);
    session.ytdlp({ type: "stream-start" }, 0);
    session.ytdlp({ type: "progress", progress: { downloadedBytes: 4, totalBytes: 10 } }, 0);
    const snapshot = session.getSnapshot();
    expect(knownTotalBytes(snapshot)).toBe(110);
    expect(downloadedBytes(snapshot)).toBe(104);
  });
});

describe("heroFrameKey", () => {
  it("changes as the download moves", () => {
    const session = running("video");
    const before = heroFrameKey(session.getSnapshot(), 1000);
    session.succeed({}, 2000);
    expect(heroFrameKey(session.getSnapshot(), 2000)).not.toBe(before);
  });
});
