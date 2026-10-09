import { describe, expect, it } from "vitest";
import type { TrackInfo } from "@/bindings";
import type { RemoteTrack } from "@/lib/remote-protocol";
import { ApiError } from "../api";
import {
  buildDownloadCommand,
  defaultDownloadDir,
  extractSoundCloudLink,
  formatTrackCount,
  outputDirOverride,
  resolveErrorMessage,
  shortenHome,
} from "../downloadLink";

const HOME = "/Users/me";
const track: RemoteTrack = {
  trackId: 1,
  trackUrl: "https://soundcloud.com/a/b",
  title: "Song",
  artist: "Artist",
  artistId: 2,
  artworkUrl: null,
  durationMs: 1000,
  waveformUrl: null,
};
const raw = { id: 1 } as TrackInfo;

describe("extractSoundCloudLink", () => {
  it.each([
    ["https://soundcloud.com/a/b", "https://soundcloud.com/a/b"],
    ["  https://on.soundcloud.com/abc123 \n", "https://on.soundcloud.com/abc123"],
    ["https://www.soundcloud.com/a/sets/b?si=x", "https://www.soundcloud.com/a/sets/b?si=x"],
    ["soundcloud.com/a/b", "soundcloud.com/a/b"],
  ])("accepts %j", (input, expected) => {
    expect(extractSoundCloudLink(input)).toBe(expected);
  });

  it.each([undefined, "", "https://example.com/a", "listen to soundcloud.com/a/b", "https://soundcloud.com"])(
    "rejects %j",
    (input) => {
      expect(extractSoundCloudLink(input)).toBeUndefined();
    },
  );
});

describe("paths", () => {
  it("shortens paths under the home directory", () => {
    expect(shortenHome("/Users/me/Music", HOME)).toBe("~/Music");
    expect(shortenHome("/Users/me", HOME)).toBe("~");
    expect(shortenHome("/Users/meow/x", HOME)).toBe("/Users/meow/x");
    expect(shortenHome("/Volumes/Drive", HOME)).toBe("/Volumes/Drive");
  });

  it("shortens Windows paths under the home directory", () => {
    expect(shortenHome("C:\\Users\\me\\Music", "C:\\Users\\me", "\\")).toBe("~\\Music");
    expect(shortenHome("D:\\Music", "C:\\Users\\me", "\\")).toBe("D:\\Music");
  });

  it("uses the system Downloads folder when the app has no download path", () => {
    expect(defaultDownloadDir("", HOME)).toBe("/Users/me/Downloads");
    expect(defaultDownloadDir("/Music/DJ", HOME)).toBe("/Music/DJ");
  });

  it("only overrides the folder when the user picked a different one", () => {
    expect(outputDirOverride("/Music/DJ", "/Music/DJ", HOME)).toBeUndefined();
    expect(outputDirOverride("/Users/me/Downloads", "", HOME)).toBeUndefined();
    expect(outputDirOverride("/Volumes/Drive", "/Music/DJ", HOME)).toBe("/Volumes/Drive");
  });
});

describe("buildDownloadCommand", () => {
  const trackLink = { kind: "track" as const, track, secretToken: "s", downloadUrl: "u" };

  it("builds a downloadTrack command with token and url, outputDir only when overridden", () => {
    expect(buildDownloadCommand(trackLink, undefined)).toEqual({
      type: "downloadTrack",
      track,
      secretToken: "s",
      downloadUrl: "u",
    });
    expect(buildDownloadCommand(trackLink, "/x")).toMatchObject({ outputDir: "/x" });
  });

  it("sends the raw playlist tracks in downloadPlaylist", () => {
    const playlist = {
      id: 9,
      ownerId: 3,
      title: "My Set",
      owner: "Owner",
      artworkUrl: null,
      trackCount: 1,
      tracks: [raw],
      secretToken: null,
    };
    const command = buildDownloadCommand({ kind: "playlist", playlist }, "/x");
    expect(command).toEqual({ type: "downloadPlaylist", title: "My Set", tracks: [raw], outputDir: "/x" });
    expect(command.type === "downloadPlaylist" && command.tracks[0]).toBe(raw);
  });
});

describe("formatTrackCount", () => {
  it("shows how many tracks will download", () => {
    expect(formatTrackCount(1, 1)).toBe("1 track");
    expect(formatTrackCount(12, 12)).toBe("12 tracks");
    expect(formatTrackCount(10, 12)).toBe("10 of 12 tracks");
  });
});

describe("resolveErrorMessage", () => {
  it("prefers the backend detail", () => {
    expect(resolveErrorMessage(new ApiError("/api/resolve-link", 400, "Not a SoundCloud URL"))).toBe(
      "Not a SoundCloud URL",
    );
    expect(resolveErrorMessage(new ApiError("/api/resolve-link", 500))).toBe(
      "/api/resolve-link failed with status 500",
    );
    expect(resolveErrorMessage(new Error("boom"))).toBe("boom");
  });
});
