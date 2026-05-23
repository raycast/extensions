import { describe, it, expect } from "vitest";
import {
  clampFiletype,
  defaultFiletype,
  filetypeGuidance,
  requiredTools,
  resolveTool,
  supportedFiletypes,
} from "../src/lib/filetype";

describe("defaultFiletype", () => {
  it("maps a gallery source to image", () => {
    expect(defaultFiletype("gallery", false)).toBe("image");
  });
  it("maps a spotify source to audio", () => {
    expect(defaultFiletype("spotify", false)).toBe("audio");
  });
  it("maps a webpage source to website", () => {
    expect(defaultFiletype("webpage", false)).toBe("website");
  });
  it("maps a video source to video when audio is not preferred", () => {
    expect(defaultFiletype("video", false)).toBe("video");
  });
  it("maps a video source to audio when audio is preferred", () => {
    expect(defaultFiletype("video", true)).toBe("audio");
  });
});

describe("resolveTool", () => {
  it("routes video to yt-dlp", () => {
    expect(resolveTool("video", "video")).toBe("yt-dlp");
  });
  it("routes transcript to yt-dlp", () => {
    expect(resolveTool("video", "transcript")).toBe("yt-dlp");
  });
  it("routes audio on a Spotify source to spotdl", () => {
    expect(resolveTool("spotify", "audio")).toBe("spotdl");
  });
  it("routes audio elsewhere to yt-dlp", () => {
    expect(resolveTool("video", "audio")).toBe("yt-dlp");
  });
  it("routes image on a gallery source to gallery-dl", () => {
    expect(resolveTool("gallery", "image")).toBe("gallery-dl");
  });
  it("routes image elsewhere to yt-dlp (thumbnail)", () => {
    expect(resolveTool("video", "image")).toBe("yt-dlp");
  });
  it("routes website to monolith", () => {
    expect(resolveTool("webpage", "website")).toBe("monolith");
  });
});

describe("requiredTools", () => {
  it("video needs the full yt-dlp toolchain", () => {
    expect(requiredTools("video", "video")).toEqual(["yt-dlp", "ffmpeg", "ffprobe", "deno"]);
  });
  it("audio on a video site needs the full yt-dlp toolchain", () => {
    expect(requiredTools("video", "audio")).toEqual(["yt-dlp", "ffmpeg", "ffprobe", "deno"]);
  });
  it("audio on a Spotify source needs spotdl + ffmpeg", () => {
    expect(requiredTools("spotify", "audio")).toEqual(["spotdl", "ffmpeg"]);
  });
  it("image on a gallery source needs gallery-dl", () => {
    expect(requiredTools("gallery", "image")).toEqual(["gallery-dl"]);
  });
  it("image on a video site needs yt-dlp + ffmpeg", () => {
    expect(requiredTools("video", "image")).toEqual(["yt-dlp", "ffmpeg"]);
  });
  it("transcript needs yt-dlp + ffmpeg", () => {
    expect(requiredTools("video", "transcript")).toEqual(["yt-dlp", "ffmpeg"]);
  });
  it("website needs monolith", () => {
    expect(requiredTools("webpage", "website")).toEqual(["monolith"]);
  });
});

describe("supportedFiletypes", () => {
  it("a gallery source supports only image", () => {
    expect(supportedFiletypes("gallery")).toEqual(["image"]);
  });
  it("a spotify source supports only audio", () => {
    expect(supportedFiletypes("spotify")).toEqual(["audio"]);
  });
  it("a webpage source supports only website", () => {
    expect(supportedFiletypes("webpage")).toEqual(["website"]);
  });
  it("a video source supports video, audio, image (thumbnail) and transcript, but not website", () => {
    expect(supportedFiletypes("video")).toEqual(["video", "audio", "image", "transcript"]);
  });
  it("the preselected default is always within the supported set", () => {
    for (const source of ["video", "gallery", "spotify", "webpage"] as const) {
      expect(supportedFiletypes(source)).toContain(defaultFiletype(source, false));
      expect(supportedFiletypes(source)).toContain(defaultFiletype(source, true));
    }
  });
  it("every supported (source, filetype) pair resolves to a real tool", () => {
    for (const source of ["video", "gallery", "spotify", "webpage"] as const) {
      for (const ft of supportedFiletypes(source)) {
        expect(requiredTools(source, ft).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("clampFiletype", () => {
  it("keeps a supported filetype unchanged", () => {
    expect(clampFiletype("video", "audio", false)).toBe("audio");
    expect(clampFiletype("gallery", "image", false)).toBe("image");
  });
  it("snaps an unsupported filetype to the source default (gallery + video → image)", () => {
    expect(clampFiletype("gallery", "video", false)).toBe("image");
    expect(clampFiletype("gallery", "transcript", false)).toBe("image");
  });
  it("honours audioPreferred when snapping on a video source", () => {
    // website is never supported on a video source, so it must snap to the default
    expect(clampFiletype("video", "website", true)).toBe("audio");
    expect(clampFiletype("video", "website", false)).toBe("video");
  });
});

describe("filetypeGuidance", () => {
  it("returns a non-empty hint for every source", () => {
    for (const source of ["video", "gallery", "spotify", "webpage"] as const) {
      expect(filetypeGuidance(source).length).toBeGreaterThan(0);
    }
  });
  it("explains the gallery restriction (mentions image or gallery)", () => {
    expect(filetypeGuidance("gallery").toLowerCase()).toMatch(/image|gallery/);
  });
});
