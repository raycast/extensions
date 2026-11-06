import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseStreamInfo,
  canStreamCopy,
  buildReencodeConcatGraph,
  normaliseMergeBaseName,
  type StreamInfo,
} from "../../src/utils/merge";

const SAMPLE_STDERR_MP4 = `
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'a.mp4':
  Duration: 00:00:10.00, start: 0.000000, bitrate: 5000 kb/s
    Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], 4700 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
    Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s (default)
`;

describe("parseStreamInfo", () => {
  it("extracts duration, video codec/resolution/fps, and audio codec/sample rate/channels", () => {
    const info = parseStreamInfo(SAMPLE_STDERR_MP4);
    assert.equal(info.durationSec, 10);
    assert.equal(info.videoCodec, "h264");
    assert.equal(info.videoWidth, 1920);
    assert.equal(info.videoHeight, 1080);
    assert.equal(info.videoFps, 30);
    assert.equal(info.audioCodec, "aac");
    assert.equal(info.audioSampleRate, 48000);
    assert.equal(info.audioChannels, 2);
  });

  it("handles mono audio layouts", () => {
    const stderr = `  Duration: 00:00:01.00\n    Stream #0:0: Audio: mp3, 44100 Hz, mono, s16p, 64 kb/s`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.audioCodec, "mp3");
    assert.equal(info.audioSampleRate, 44100);
    assert.equal(info.audioChannels, 1);
  });

  it("returns an empty-ish StreamInfo for unrelated text", () => {
    const info = parseStreamInfo("no media metadata here");
    assert.equal(info.durationSec, undefined);
    assert.equal(info.videoCodec, undefined);
    assert.equal(info.audioCodec, undefined);
  });

  it("extracts at least the video codec when the detail regex misses", () => {
    const stderr = `Stream #0:0: Video: vp9, yuv420p`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoCodec, "vp9");
    assert.equal(info.videoWidth, undefined);
  });

  it("parses dimensions from a pix_fmt that contains commas inside parentheses", () => {
    // yuv420p(tv, bt709) has a comma inside — the old two-comma regex failed here.
    const stderr = `  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 2396 kb/s, 30 fps, 30 tbr, 15360 tbn (default)`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoCodec, "h264");
    assert.equal(info.videoWidth, 1920);
    assert.equal(info.videoHeight, 1080);
    assert.equal(info.videoFps, 30);
  });

  it("swaps width and height for a 90-degree displaymatrix rotation", () => {
    const stderr = `  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
    Side data:
      displaymatrix: rotation of -90.00 degrees`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoWidth, 1080);
    assert.equal(info.videoHeight, 1920);
  });

  it("swaps width and height for a 270-degree rotate tag", () => {
    const stderr = `  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
  Metadata:
    rotate          : 270`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoWidth, 1080);
    assert.equal(info.videoHeight, 1920);
  });

  it("ignores the rotation of a later video stream", () => {
    const stderr = `  Stream #0:0[0x1](und): Video: h264 (High), yuv420p(progressive), 1920x1080, 30 fps, 30 tbr
  Stream #0:1[0x2](und): Video: h264 (High), yuv420p(progressive), 1280x720, 30 fps, 30 tbr
    Side data:
      Display Matrix: rotation of 90.00 degrees`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoWidth, 1920);
    assert.equal(info.videoHeight, 1080);
    assert.equal(info.videoRotation, 0);
  });

  it("does not swap dimensions for a 180-degree rotation", () => {
    const stderr = `  Stream #0:0: Video: h264, yuv420p, 1920x1080, 30 fps
    Side data:
      displaymatrix: rotation of 180.00 degrees`;
    const info = parseStreamInfo(stderr);
    assert.equal(info.videoWidth, 1920);
    assert.equal(info.videoHeight, 1080);
  });
});

describe("canStreamCopy", () => {
  it("rejects clips with the same display size but different rotation", () => {
    const portrait = parseStreamInfo(
      `  Stream #0:0: Video: h264 (High), yuv420p(progressive), 720x1280, 30 fps\n  Stream #0:1: Audio: aac (LC), 44100 Hz, mono, fltp`,
    );
    const rotated = parseStreamInfo(
      `  Stream #0:0: Video: h264 (High), yuv420p(progressive), 1280x720, 30 fps\n    Side data:\n      Display Matrix: rotation of 90.00 degrees\n  Stream #0:1: Audio: aac (LC), 44100 Hz, mono, fltp`,
    );
    assert.deepEqual([rotated.videoWidth, rotated.videoHeight], [portrait.videoWidth, portrait.videoHeight]);
    assert.equal(canStreamCopy([portrait, rotated]), false);
  });

  const A: StreamInfo = {
    videoCodec: "h264",
    videoWidth: 1920,
    videoHeight: 1080,
    videoFps: 30,
    audioCodec: "aac",
    audioSampleRate: 48000,
    audioChannels: 2,
  };

  it("returns true for identical streams", () => {
    assert.equal(canStreamCopy([A, { ...A }]), true);
  });

  it("returns true for 3 identical streams", () => {
    assert.equal(canStreamCopy([A, { ...A }, { ...A }]), true);
  });

  it("returns false when video codec differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoCodec: "hevc" }]), false);
  });

  it("returns false when resolution differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoWidth: 1280, videoHeight: 720 }]), false);
  });

  it("returns false when fps differs", () => {
    assert.equal(canStreamCopy([A, { ...A, videoFps: 60 }]), false);
  });

  it("returns false when audio codec differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioCodec: "mp3" }]), false);
  });

  it("returns false when audio sample rate differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioSampleRate: 44100 }]), false);
  });

  it("returns false when audio channel count differs", () => {
    assert.equal(canStreamCopy([A, { ...A, audioChannels: 1 }]), false);
  });

  it("returns false when one stream has audio and the other does not", () => {
    const noAudio: StreamInfo = { ...A, audioCodec: undefined, audioSampleRate: undefined, audioChannels: undefined };
    assert.equal(canStreamCopy([A, noAudio]), false);
  });

  it("returns false for a single stream (need at least 2 to merge)", () => {
    assert.equal(canStreamCopy([A]), false);
  });

  it("returns false when a required field is missing (safety)", () => {
    const incomplete: StreamInfo = { videoCodec: "h264" };
    assert.equal(canStreamCopy([A, incomplete]), false);
  });

  it("tolerates tiny fps drift (< 0.1 fps)", () => {
    assert.equal(canStreamCopy([A, { ...A, videoFps: 30.05 }]), true);
  });

  describe("audio-only inputs", () => {
    const AUDIO: StreamInfo = {
      audioCodec: "mp3",
      audioSampleRate: 44100,
      audioChannels: 2,
    };

    it("returns true for two compatible audio-only streams", () => {
      assert.equal(canStreamCopy([AUDIO, { ...AUDIO }]), true);
    });

    it("returns false when audio-only sample rates differ", () => {
      assert.equal(canStreamCopy([AUDIO, { ...AUDIO, audioSampleRate: 48000 }]), false);
    });

    it("returns false when audio-only codecs differ", () => {
      assert.equal(canStreamCopy([AUDIO, { ...AUDIO, audioCodec: "aac" }]), false);
    });

    it("returns false when one input has video and the other is audio-only", () => {
      assert.equal(canStreamCopy([A, AUDIO]), false);
      assert.equal(canStreamCopy([AUDIO, A]), false);
    });
  });
});

describe("concat list path escaping", () => {
  // Mirrors the escape logic in mergeMedia (FFmpeg concat demuxer format,
  // not shell). Backslashes first, then single quotes — both with `\` prefix.
  const escape = (p: string) => p.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  it("escapes single quotes with backslash (concat demuxer style, not shell)", () => {
    assert.equal(escape("/Users/alice's files/clip.mp4"), "/Users/alice\\'s files/clip.mp4");
  });

  it("escapes backslashes before quotes so the order is correct", () => {
    assert.equal(escape("a\\'b"), "a\\\\\\'b");
  });

  it("leaves vanilla paths untouched", () => {
    assert.equal(escape("/Users/maia/Desktop/clip.mp4"), "/Users/maia/Desktop/clip.mp4");
  });

  it("does NOT produce shell-style escape sequences", () => {
    assert.notEqual(escape("alice's"), "alice'\\''s");
  });
});

describe("buildReencodeConcatGraph", () => {
  it("omits audio pads for video inputs without audio streams", () => {
    const graph = buildReencodeConcatGraph(2, "video", [{ videoCodec: "h264" }, { videoCodec: "h264" }]);

    assert.equal(graph.filter, "[0:v:0][1:v:0]concat=n=2:v=1:a=0[v]");
    assert.deepEqual(graph.mapArgs, ["-map", "[v]"]);
  });

  it("keeps audio pads when every video input has audio", () => {
    const graph = buildReencodeConcatGraph(2, "video", [
      { videoCodec: "h264", audioCodec: "aac" },
      { videoCodec: "h264", audioCodec: "aac" },
    ]);

    assert.equal(graph.filter, "[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v][a]");
    assert.deepEqual(graph.mapArgs, ["-map", "[v]", "-map", "[a]"]);
  });

  it("omits audio pads when only some video inputs have audio", () => {
    const graph = buildReencodeConcatGraph(2, "video", [
      { videoCodec: "h264", audioCodec: "aac" },
      { videoCodec: "h264" },
    ]);

    assert.equal(graph.filter, "[0:v:0][1:v:0]concat=n=2:v=1:a=0[v]");
    assert.deepEqual(graph.mapArgs, ["-map", "[v]"]);
  });

  it("inserts scale filters when video inputs have different dimensions", () => {
    const graph = buildReencodeConcatGraph(2, "video", [
      { videoCodec: "av1", videoWidth: 1280, videoHeight: 704, audioCodec: "aac" },
      { videoCodec: "av1", videoWidth: 1280, videoHeight: 720, audioCodec: "aac" },
    ]);

    assert.equal(
      graph.filter,
      "[0:v:0]scale=1280:704:force_original_aspect_ratio=decrease,pad=1280:704:(ow-iw)/2:(oh-ih)/2,setsar=1[sv0];[1:v:0]scale=1280:704:force_original_aspect_ratio=decrease,pad=1280:704:(ow-iw)/2:(oh-ih)/2,setsar=1[sv1];[sv0][0:a:0][sv1][1:a:0]concat=n=2:v=1:a=1[v][a]",
    );
    assert.deepEqual(graph.mapArgs, ["-map", "[v]", "-map", "[a]"]);
  });

  it("scales mismatched inputs when probed from real FFmpeg output", () => {
    // Captured from `ffmpeg -hide_banner -i` (FFmpeg 9.0) for a 1280x704 clip
    // tagged bt709, a 1280x720 clip, and a 1280x720 clip with 90 degree display rotation.
    const probes = [
      `  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709/unknown/unknown, progressive), 1280x704 [SAR 1:1 DAR 20:11], 159 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 70 kb/s (default)`,
      `  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709/unknown/unknown, progressive), 1280x720 [SAR 1:1 DAR 16:9], 160 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 70 kb/s (default)`,
      `  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1280x720 [SAR 1:1 DAR 16:9], 163 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
    Side data:
      Display Matrix: rotation of 90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 70 kb/s (default)`,
    ].map(parseStreamInfo);

    assert.deepEqual(
      probes.map((p) => [p.videoWidth, p.videoHeight]),
      [
        [1280, 704],
        [1280, 720],
        [720, 1280],
      ],
    );
    const graph = buildReencodeConcatGraph(3, "video", probes);
    assert.equal(
      graph.filter,
      "[0:v:0]scale=1280:704:force_original_aspect_ratio=decrease,pad=1280:704:(ow-iw)/2:(oh-ih)/2,setsar=1[sv0];[1:v:0]scale=1280:704:force_original_aspect_ratio=decrease,pad=1280:704:(ow-iw)/2:(oh-ih)/2,setsar=1[sv1];[2:v:0]scale=1280:704:force_original_aspect_ratio=decrease,pad=1280:704:(ow-iw)/2:(oh-ih)/2,setsar=1[sv2];[sv0][0:a:0][sv1][1:a:0][sv2][2:a:0]concat=n=3:v=1:a=1[v][a]",
    );
  });

  it("does not insert scale filters when video inputs share the same dimensions", () => {
    const graph = buildReencodeConcatGraph(2, "video", [
      { videoCodec: "av1", videoWidth: 1280, videoHeight: 720, audioCodec: "aac" },
      { videoCodec: "av1", videoWidth: 1280, videoHeight: 720, audioCodec: "aac" },
    ]);

    assert.equal(graph.filter, "[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v][a]");
    assert.deepEqual(graph.mapArgs, ["-map", "[v]", "-map", "[a]"]);
  });
});

describe("normaliseMergeBaseName", () => {
  it("avoids duplicate extensions", () => {
    assert.equal(normaliseMergeBaseName("episode.mp3", ".mp3"), "episode");
  });

  it("rejects output path traversal", () => {
    assert.throws(() => normaliseMergeBaseName("../outside", ".mp4"), /bare filename/);
    assert.throws(() => normaliseMergeBaseName("nested/file", ".mp4"), /bare filename/);
  });
});
