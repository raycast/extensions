// ISC-66: only an https open.spotify.com episode or show sends --spotify=.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ArgvError, buildArgv, isSpotifyUrl } from "../lib/argv";
import { classifyText, describeInput } from "../lib/classify";

const FAKE = join(import.meta.dir, "fake-fabric.sh");
const EPISODE = "https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk";

describe("ISC-66: Spotify episodes and shows go to --spotify=, nothing else does", () => {
  test.each([EPISODE, `${EPISODE}?si=abc123`, "https://open.spotify.com/show/2MAi0BvDc6GTFvKFPXnkCL", `${EPISODE}/`])(
    "%s → --spotify=",
    (url) => {
      const input = classifyText(url);
      expect(input.kind).toBe("spotify");
      expect(buildArgv({ input, pattern: "summarize" })).toEqual(["--pattern=summarize", `--spotify=${url}`]);
    },
  );

  test.each([
    "https://open.spotify.com/track/4rOoJ6Egrf8K2IrywzwOMk", // a song: fabric's flag is for podcasts
    "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    "http://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk", // not https
    "https://open.spotify.com.evil.example/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://xopen.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://evil.example/open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://user@open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://open.spotify.com:8443/episode/4rOoJ6Egrf8K2IrywzwOMk",
    "https://open.spotify.com/episode/../track/4rOoJ6Egrf8K2IrywzwOMk",
    "https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk/extra",
    "https://:pw@open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk",
  ])("%s → not --spotify=", (url) => {
    expect(isSpotifyUrl(url)).toBe(false);
    const argv = buildArgv({ input: classifyText(url), pattern: "summarize" });
    expect(argv.some((a) => a.startsWith("--spotify="))).toBe(false);
  });

  test("what is sent is the URL as checked: an uppercase host goes out lowercased", () => {
    const argv = buildArgv({
      input: { kind: "spotify", url: "https://OPEN.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk" },
    });
    expect(argv).toEqual(["--spotify=https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk"]);
  });

  test("buildArgv refuses a spotify input that isn't one, however it was built", () => {
    expect(() => buildArgv({ input: { kind: "spotify", url: "https://evil.example/episode/x" } })).toThrow(ArgvError);
  });

  test("the form calls it metadata, since fabric doesn't fetch the audio", () => {
    expect(describeInput(classifyText(EPISODE))).toContain("metadata");
  });

  test("the strict fake takes the argv", () => {
    const argv = buildArgv({ input: classifyText(EPISODE), pattern: "summarize", stream: true, showMetadata: true });
    const r = spawnSync("/bin/sh", [FAKE, ...argv], { input: "", encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
