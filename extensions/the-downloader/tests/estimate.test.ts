import { describe, it, expect } from "vitest";
import { estimateQuality, heightOf, maxHeight, qualityTitle, selectFormats } from "../src/lib/estimate";
import { Format, Video } from "../src/types";

const MB = 1_000_000;

function fmt(partial: Partial<Format> & { format_id: string }): Format {
  return {
    vcodec: "none",
    acodec: "none",
    ext: "mp4",
    video_ext: "none",
    protocol: "https",
    resolution: "audio only",
    tbr: null,
    ...partial,
  };
}

// yt-dlp order: worst first.
const video: Video = {
  title: "Clip",
  duration: 100,
  formats: [
    fmt({ format_id: "139", acodec: "mp4a.40.5", ext: "m4a", filesize: 1 * MB }),
    fmt({ format_id: "140", acodec: "mp4a.40.2", ext: "m4a", filesize: 3 * MB }),
    fmt({ format_id: "251", acodec: "opus", ext: "webm", filesize: 4 * MB }),
    fmt({ format_id: "18", vcodec: "avc1.42001E", acodec: "mp4a.40.2", resolution: "640x360", filesize: 9 * MB }),
    fmt({ format_id: "134", vcodec: "avc1.4d401e", resolution: "640x360", height: 360, filesize: 5 * MB }),
    fmt({ format_id: "136", vcodec: "avc1.4d401f", resolution: "1280x720", height: 720, filesize: 20 * MB }),
    fmt({ format_id: "137", vcodec: "avc1.640028", resolution: "1920x1080", height: 1080, filesize: 40 * MB }),
    fmt({ format_id: "313", vcodec: "vp9", ext: "webm", resolution: "3840x2160", height: 2160, tbr: 16000 }),
  ],
};

describe("heightOf", () => {
  it("prefers the height field and falls back to the resolution string", () => {
    expect(heightOf(fmt({ format_id: "a", height: 720, resolution: "x" }))).toBe(720);
    expect(heightOf(fmt({ format_id: "b", resolution: "640x360" }))).toBe(360);
    expect(heightOf(fmt({ format_id: "c" }))).toBeUndefined();
  });
});

describe("selectFormats", () => {
  it("picks H.264 + m4a for mp4, capped by height", () => {
    expect(selectFormats(video, "1080", "mp4")?.map((f) => f.format_id)).toEqual(["137", "140"]);
    expect(selectFormats(video, "720", "mp4")?.map((f) => f.format_id)).toEqual(["136", "140"]);
  });

  it("uses the best streams of any codec for other containers", () => {
    expect(selectFormats(video, "best", "mkv")?.map((f) => f.format_id)).toEqual(["313", "251"]);
  });

  it("walks from the worst end for Smallest File", () => {
    expect(selectFormats(video, "smallest", "mp4")?.map((f) => f.format_id)).toEqual(["134", "139"]);
  });

  it("falls back to a progressive file when there are no separate streams", () => {
    const progressiveOnly: Video = { ...video, formats: [video.formats[3]] };
    expect(selectFormats(progressiveOnly, "best", "mp4")?.map((f) => f.format_id)).toEqual(["18"]);
  });

  it("returns undefined when nothing matches", () => {
    expect(selectFormats({ ...video, formats: [] }, "best", "mp4")).toBeUndefined();
  });
});

describe("estimateQuality", () => {
  it("adds the stream sizes and reports the video height", () => {
    expect(estimateQuality(video, "1080", "mp4")).toEqual({ height: 1080, bytes: 43 * MB });
  });

  it("derives a size from the bitrate when none is published", () => {
    // 16000 kbit/s for 100 s = 200 MB, plus 4 MB of opus audio.
    expect(estimateQuality(video, "best", "webm")).toEqual({ height: 2160, bytes: 204 * MB });
  });

  it("leaves the size out when a stream has no size information", () => {
    const noSize: Video = { ...video, formats: video.formats.map((f) => ({ ...f, filesize: undefined, tbr: null })) };
    expect(estimateQuality(noSize, "1080", "mp4")).toEqual({ height: 1080, bytes: undefined });
  });
});

describe("qualityTitle", () => {
  it("shows what the choice resolves to", () => {
    expect(qualityTitle("best", { height: 2160, bytes: 204 * MB })).toBe("Best Available · 2160p · ≈ 204 MB");
    expect(qualityTitle("1080", { height: 1080, bytes: 43 * MB })).toBe("1080p · ≈ 43.0 MB");
    expect(qualityTitle("1080", { height: 720, bytes: 23 * MB })).toBe("1080p · 720p max · ≈ 23.0 MB");
    expect(qualityTitle("480")).toBe("480p");
  });
});

describe("maxHeight", () => {
  it("finds the tallest video stream", () => {
    expect(maxHeight(video)).toBe(2160);
    expect(maxHeight({ ...video, formats: [] })).toBeUndefined();
  });
});
