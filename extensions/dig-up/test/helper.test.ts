// Tests for the Swift helper (assets/digup-helper) through its TypeScript client, engine/helper.ts. DigUp's own tests
// (ImageSizingTests, ImageTests, VideoTests, SearchTextTests) are ported where they exist; the rest checks DigUp's
// rules on the testbed (.testbed, gitignored: those tests skip without it). The client's restart, timeout and reply
// paths run against a stand-in shell script.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  DEFAULT_OP_TIMEOUT_MS,
  Helper,
  HelperError,
  mtmdBeside,
  type MediaPiece,
  type WalkArgs,
  type WalkResult,
} from "../engine/helper";
import type { Log } from "../engine/log";

const repo = resolve(import.meta.dirname, "..");
const bin = join(repo, "assets/digup-helper");
const testbed = join(repo, ".testbed");
const fixtures = join(repo, "test/fixtures/digup");
const missing = existsSync(bin) ? false : `${bin} is missing: build it with scripts/build-helper.sh`;
const noTestbed = existsSync(testbed) ? false : `${testbed} is missing (DigUp's eval testbed)`;
/** llama.cpp's libmtmd (stb_image), as the daemon passes it. */
const mtmd = join(repo, ".vendor/llama-b11624/libmtmd.dylib");
const noMtmd = existsSync(mtmd) ? false : `${mtmd} is missing`;

/** DigUp: Rules.skippedFolderNames. */
const developerFolders = [
  "node_modules",
  "bower_components",
  "venv",
  "site-packages",
  "__pycache__",
  "DerivedData",
  "Pods",
  "Carthage",
];

const temps: string[] = [];
function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "digup-helper-")));
  temps.push(dir);
  return dir;
}
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A Log that keeps what it's told, for checking the helper's stderr. */
function recordingLog(): Log & { lines: string[] } {
  const lines: string[] = [];
  const keep = (message: string) => void lines.push(message);
  return { lines, info: keep, warn: keep, error: keep };
}

async function rejectsWith(promise: Promise<unknown>, kind: HelperError["kind"], message?: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof HelperError, `expected a HelperError, got ${String(error)}`);
    assert.equal(error.kind, kind, error.message);
    if (message) assert.match(error.message, message);
    return true;
  });
}

/** 16 kHz mono PCM16 WAV: a 440 Hz tone where `loud(seconds)` is true, silence elsewhere. */
function writeWav(path: string, seconds: number, loud: (t: number) => boolean = () => true): void {
  const samples = Math.round(seconds * 16000);
  const data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF", 0, "ascii");
  data.writeUInt32LE(36 + samples * 2, 4);
  data.write("WAVEfmt ", 8, "ascii");
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24);
  data.writeUInt32LE(32000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36, "ascii");
  data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / 16000;
    data.writeInt16LE(loud(t) ? Math.round(Math.sin(2 * Math.PI * 440 * t) * 8000) : 0, 44 + i * 2);
  }
  writeFileSync(path, data);
}

const spans = (pieces: MediaPiece[]) => pieces.map((piece) => [piece.start, piece.end]);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A running process whose arguments end with `args`. */
function running(args: string): boolean {
  return spawnSync("/usr/bin/pgrep", ["-f", `${args}$`]).status === 0;
}

async function waitFor(condition: () => boolean, ms: number): Promise<boolean> {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) if (condition()) return true;
  return condition();
}

/** Seconds for the helper's `childTest` sleep that no other process has, and how they show in `ps`. Always with a
 * fraction: Swift writes a whole number as "600.0" where JavaScript writes "600". */
function uniqueSleep(): { seconds: number; args: string } {
  const seconds = 600 + (process.pid % 997) + 0.25 + (Date.now() % 3) / 4;
  return { seconds, args: `/bin/sleep ${seconds}` };
}

/** Where the helper looks for ffmpeg: PATH, then Homebrew's folders. */
function findTool(name: string): string | null {
  for (const folder of [...(process.env.PATH ?? "").split(":"), "/opt/homebrew/bin", "/usr/local/bin"]) {
    try {
      if (statSync(join(folder, name)).isFile()) return join(folder, name);
    } catch {
      // not here
    }
  }
  return null;
}

describe("digup-helper", { skip: missing }, () => {
  let helper: Helper;
  let log: ReturnType<typeof recordingLog>;
  let out: string;

  before(() => {
    log = recordingLog();
    helper = new Helper(bin, log, { mtmdLibrary: noMtmd ? null : mtmd });
    out = tempDir();
  });
  after(() => helper.close());

  /** A picture file's size, as the model's decoder would read it. */
  async function pictureSize(path: string) {
    const { width, height } = await helper.call<{ width: number; height: number }>("pixelsTest", { path, points: [] });
    return { width, height };
  }

  /** Size and the color in the middle of each quadrant (TL, TR, BL, BR) as R, G, B or Y: DigUp's ImageTests.decode. */
  async function quadrants(path: string) {
    const { width, height } = await pictureSize(path);
    const points = [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ].map(([qx, qy]) => [Math.floor((qx * width) / 4), Math.floor((qy * height) / 4)]);
    const { rgb } = await helper.call<{ rgb: number[][] }>("pixelsTest", { path, points });
    return { width, height, colors: rgb.map(colorName) };
  }

  function colorName([r, g, b]: number[]): string {
    const names: Record<string, string> = { "100": "R", "010": "G", "001": "B", "110": "Y" };
    return names[`${+(r > 128)}${+(g > 128)}${+(b > 128)}`] ?? `(${r},${g},${b})`;
  }

  describe("protocol", () => {
    it("answers ping and power", async () => {
      assert.match((await helper.ping()).version, /^\d+\.\d+\.\d+$/);
      const power = await helper.power();
      assert.equal(typeof power.onBattery, "boolean");
      assert.equal(typeof power.lowPower, "boolean");
      assert.ok(["nominal", "fair", "serious", "critical"].includes(power.thermal), power.thermal);
    });

    it("fails a bad request without dying", async () => {
      await rejectsWith(helper.call("noSuchOp"), "op", /unknown op/);
      await rejectsWith(
        helper.image({ path: join(out, "nope.jpg"), screenshot: false, budget: 140, out: join(out, "x.png") }),
        "op",
        /unreadable/,
      );
      await rejectsWith(
        helper.pdf({ path: join(fixtures, "reference/speech.wav"), from: 0, to: 5, outDir: out }),
        "op",
        /can't open PDF/,
      );
      await rejectsWith(helper.audio({ path: join(out, "nope.wav"), outDir: out, window: 0 }), "op", /window/);
      await rejectsWith(helper.video({ path: join(out, "nope.mp4"), outDir: out, interval: 0 }), "op", /interval/);
      await rejectsWith(
        helper.size({ path: join(fixtures, "reference/photo.jpg"), budget: -1, out: join(out, "x.png") }),
        "op",
        /budget/,
      );
      assert.ok((await helper.ping()).version);
    });

    it("fails a request it can't parse at once, not after the time limit", async () => {
      // A JS string cut inside an emoji: JSON.stringify writes the lone surrogate, which the helper can't parse.
      const began = Date.now();
      await rejectsWith(
        helper.thumb({ path: join(out, "cut-\ud83d.jpg"), out: join(out, "x.jpg"), maxPixel: 64 }),
        "op",
        /bad request/,
      );
      assert.ok(Date.now() - began < 5000, `${Date.now() - began} ms`);
      assert.ok((await helper.ping()).version);
    });

    it("finds a tool installed after it started", async () => {
      const folder = tempDir();
      const name = `digup-test-tool-${process.pid}`;
      const path = process.env.PATH;
      process.env.PATH = `${folder}:${path}`; // the helper takes PATH when it starts
      const client = new Helper(bin, recordingLog());
      try {
        assert.equal((await client.call<{ path: string | null }>("toolTest", { name })).path, null);
        writeFileSync(join(folder, name), "#!/bin/sh\n");
        chmodSync(join(folder, name), 0o755);
        assert.equal((await client.call<{ path: string | null }>("toolTest", { name })).path, join(folder, name));
      } finally {
        process.env.PATH = path;
        await client.close();
      }
    });

    it("ends the tools it runs when it is killed after a time limit", async () => {
      const client = new Helper(bin, recordingLog());
      const child = uniqueSleep();
      try {
        const outcome = client
          .call("childTest", { seconds: child.seconds }, { timeoutMs: 1500 })
          .catch((error) => error);
        assert.ok(await waitFor(() => running(child.args), 1200), "the child never started");
        await rejectsWith(
          outcome.then((error) => Promise.reject(error)),
          "timeout",
        );
        assert.ok(await waitFor(() => !running(child.args), 3000), "the child outlived the helper");
      } finally {
        await client.close();
        spawnSync("/usr/bin/pkill", ["-f", `${child.args}$`]);
      }
    });

    it("stops itself past its memory limit, with its tools (DigUp Watchdog)", async () => {
      const client = new Helper(bin, recordingLog(), { memoryLimit: 1 });
      const child = uniqueSleep();
      try {
        const call = client.call("childTest", { seconds: child.seconds }, { timeoutMs: 20_000 });
        await rejectsWith(call, "memory", /^needed more than 0 MB of memory to read$/);
        assert.ok(await waitFor(() => !running(child.args), 3000), "the child outlived the helper");
      } finally {
        await client.close();
        spawnSync("/usr/bin/pkill", ["-f", `${child.args}$`]);
      }
    });
  });

  describe("model decoder", () => {
    it("decodes JPEG with llama.cpp's stb_image when given libmtmd", { skip: noMtmd }, async () => {
      assert.equal((await helper.call<{ stb: boolean }>("decoderTest")).stb, true);
      // stb and ImageIO read the same JPEG a little differently (DigUp's embedder reads it with stb).
      const path = join(fixtures, "reference/photo.jpg");
      const points: number[][] = [];
      for (let y = 0; y < 768; y += 16) for (let x = 0; x < 1024; x += 16) points.push([x, y]);
      const stb = await helper.call<{ rgb: number[][] }>("pixelsTest", { path, points });
      const imageIO = await helper.call<{ rgb: number[][] }>("pixelsTest", { path, points, imageIO: true });
      assert.notDeepEqual(stb.rgb, imageIO.rgb);
    });

    it("falls back to ImageIO without libmtmd", async () => {
      const client = new Helper(bin, recordingLog());
      try {
        assert.equal((await client.call<{ stb: boolean }>("decoderTest")).stb, false);
        const sized = await client.size({
          path: join(fixtures, "reference/photo.jpg"),
          budget: 70,
          out: join(out, "io.png"),
        });
        assert.deepEqual(sized.sized, { width: 432, height: 336 });
      } finally {
        await client.close();
      }
    });

    it("finds libmtmd beside llama-server or in Homebrew's lib folder", () => {
      const release = tempDir();
      writeFileSync(join(release, "llama-server"), "");
      assert.equal(mtmdBeside(join(release, "llama-server")), null);
      writeFileSync(join(release, "libmtmd.dylib"), "");
      assert.equal(mtmdBeside(join(release, "llama-server")), join(release, "libmtmd.dylib"));
      const brew = tempDir();
      mkdirSync(join(brew, "bin"));
      mkdirSync(join(brew, "lib"));
      writeFileSync(join(brew, "lib/libmtmd.dylib"), "");
      assert.equal(mtmdBeside(join(brew, "bin/llama-server")), join(brew, "bin/../lib/libmtmd.dylib"));
    });
  });

  describe("ImageSizing (DigUp ImageSizingTests)", () => {
    const target = (height: number, width: number, budget: number) =>
      helper.call<{ target: { height: number; width: number } | null }>("targetSizeTest", { height, width, budget });

    it("fills the budget", async () => {
      const cases: [number, number, number, number, number][] = [
        [900, 1440, 280, 624, 1008],
        [900, 1440, 140, 432, 672],
        [900, 1440, 70, 288, 480],
        [768, 768, 280, 768, 768],
        [768, 768, 140, 528, 528],
        [300, 300, 140, 528, 528], // small images grow to fill it, as in the reference
        [10, 4000, 140, 48, 6720], // a thin image: one 48 px row, the other side capped at the budget
      ];
      for (const [height, width, budget, h, w] of cases) {
        assert.deepEqual(
          (await target(height, width, budget)).target,
          { height: h, width: w },
          `${width}×${height} @${budget}`,
        );
      }
    });

    // A 7×5 image resized by PIL (Image.resize, BICUBIC).
    const source = [
      0, 115, 230, 3, 118, 233, 6, 121, 236, 9, 124, 239, 12, 127, 242, 15, 130, 245, 18, 133, 248, 77, 192, 51, 80,
      195, 54, 83, 198, 57, 86, 201, 60, 89, 204, 63, 92, 207, 66, 95, 210, 69, 154, 13, 128, 157, 16, 131, 160, 19,
      134, 163, 22, 137, 166, 25, 140, 169, 28, 143, 172, 31, 146, 231, 90, 205, 234, 93, 208, 237, 96, 211, 240, 99,
      214, 243, 102, 217, 246, 105, 220, 249, 108, 223, 52, 167, 26, 55, 170, 29, 58, 173, 32, 61, 176, 35, 64, 179, 38,
      67, 182, 41, 70, 185, 44,
    ];
    const resize = async (toWidth: number, toHeight: number) =>
      (
        await helper.call<{ pixels: number[] }>("resizeTest", {
          width: 7,
          height: 5,
          toWidth,
          toHeight,
          pixels: source,
        })
      ).pixels;

    it("shrinks like Pillow", async () => {
      const pil = [
        28, 151, 152, 33, 156, 157, 39, 162, 163, 44, 167, 168, 165, 68, 129, 170, 73, 134, 176, 79, 140, 181, 84, 145,
        132, 133, 106, 137, 138, 111, 143, 144, 117, 148, 149, 122,
      ];
      assert.deepEqual(await resize(4, 3), pil);
    });

    it("grows like Pillow", async () => {
      const pil = [
        0, 112, 237, 0, 113, 238, 1, 116, 241, 3, 118, 243, 5, 120, 245, 7, 122, 247, 9, 124, 249, 11, 126, 251, 14,
        129, 254, 15, 130, 255, 55, 187, 85, 56, 188, 86, 59, 191, 89, 61, 193, 91, 63, 195, 93, 65, 197, 95, 67, 199,
        97, 69, 201, 99, 72, 204, 102, 73, 205, 103, 122, 82, 83, 123, 83, 84, 126, 86, 87, 128, 88, 89, 130, 90, 91,
        132, 92, 93, 134, 94, 95, 136, 96, 97, 139, 99, 100, 140, 100, 101, 199, 27, 173, 200, 28, 174, 203, 31, 177,
        205, 33, 179, 207, 35, 181, 209, 37, 183, 211, 39, 185, 213, 41, 187, 216, 44, 190, 217, 45, 191, 197, 112, 171,
        198, 113, 172, 201, 116, 175, 203, 118, 177, 205, 120, 179, 207, 122, 181, 209, 124, 183, 211, 126, 185, 214,
        129, 188, 215, 130, 189, 45, 170, 19, 46, 171, 20, 49, 174, 23, 51, 176, 25, 53, 178, 27, 55, 180, 29, 57, 182,
        31, 59, 184, 33, 62, 187, 36, 63, 188, 37,
      ];
      assert.deepEqual(await resize(10, 6), pil);
    });

    it("resizes one axis like Pillow, and leaves a same-size image alone", async () => {
      const pil = [
        74, 120, 137, 77, 123, 140, 80, 126, 143, 83, 129, 146, 86, 132, 149, 89, 135, 152, 92, 138, 155, 153, 100, 119,
        156, 103, 122, 159, 106, 125, 162, 109, 128, 165, 112, 131, 168, 115, 134, 171, 118, 137,
      ];
      assert.deepEqual(await resize(7, 2), pil);
      assert.deepEqual(await resize(7, 5), source);
    });

    it("sizes the reference inputs as DigUp's reference test does", async () => {
      const cases: [string, number, number, number][] = [
        ["screen.png", 280, 1008, 624],
        ["photo.jpg", 140, 624, 480],
        ["photo.jpg", 70, 432, 336],
      ];
      for (const [name, budget, width, height] of cases) {
        const png = join(out, `ref-${budget}-${name}.png`);
        const sized = await helper.size({ path: join(fixtures, "reference", name), budget, out: png });
        assert.deepEqual(sized.sized, { width, height }, `${name} @${budget}`);
        assert.deepEqual(await pictureSize(png), { width, height });
      }
    });
  });

  describe("image (DigUp ImageTests)", () => {
    // 400×240, four quadrants (red, green above blue, yellow), stored turned (orientation 6) except the AVIF.
    for (const name of ["pattern-o6.jpg", "pattern-o6.heic", "pattern-o6.webp", "pattern-o6.tiff", "pattern.avif"]) {
      it(`hands the model ${name} as it's shown`, async () => {
        const png = join(out, `${name}.png`);
        const done = await helper.image({
          path: join(fixtures, "pictures", name),
          screenshot: false,
          budget: 140,
          out: png,
        });
        assert.ok(!done.tooSmall);
        assert.deepEqual(new Set([done.width, done.height]), new Set([400, 240]));
        assert.equal(done.taken, "2024:05:17 10:30:00");
        const shown = await quadrants(png);
        assert.deepEqual({ width: shown.width, height: shown.height }, done.sized);
        if (name.includes("-o6")) {
          // turned 90° clockwise: blue and red on top, yellow and green below
          assert.ok(shown.height > shown.width);
          assert.deepEqual(shown.colors, ["B", "R", "Y", "G"]);
        } else {
          assert.ok(shown.width > shown.height);
          assert.deepEqual(shown.colors, ["R", "G", "B", "Y"]);
        }
      });
    }

    it("reports small pictures instead of reading them", async () => {
      for (const name of ["pattern-o6.jpg", "pattern-o6.heic", "pattern-o6.webp"]) {
        const done = await helper.image({
          path: join(fixtures, "pictures", name),
          screenshot: false,
          budget: 140,
          out: join(out, "small.png"),
          minSide: 401,
        });
        assert.deepEqual(done, { tooSmall: true, width: 400, height: 240 });
      }
    });

    it("draws vector pictures with AppKit on white", async () => {
      const chart = join(out, "chart.svg");
      writeFileSync(
        chart,
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="400" height="400" fill="#f00"/><rect x="400" width="400" height="400" fill="#00f"/></svg>`,
      );
      const png = join(out, "chart.png");
      const done = await helper.image({ path: chart, screenshot: false, budget: 140, out: png });
      assert.ok(!done.tooSmall);
      assert.deepEqual([done.width, done.height], [800, 400]);
      assert.deepEqual(done.sized, { width: 768, height: 384 }); // 1024×512 drawn, then sized for 140 tokens
      assert.deepEqual((await quadrants(png)).colors, ["R", "B", "R", "B"]);
      const icon = join(out, "icon.svg");
      writeFileSync(
        icon,
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#0f0"/></svg>`,
      );
      assert.deepEqual(await helper.image({ path: icon, screenshot: false, budget: 140, out: png }), {
        tooSmall: true,
        width: 24,
        height: 24,
      });
    });

    it("reads a screenshot's words at full resolution", { skip: noTestbed }, async () => {
      const done = await helper.image({
        path: join(testbed, "synthetic/screenshots/shot_flight_booking.png"),
        screenshot: true,
        budget: 280,
        out: join(out, "shot.png"),
        ocr: true,
      });
      assert.ok(!done.tooSmall);
      assert.deepEqual([done.width, done.height], [1440, 900]);
      assert.deepEqual(done.sized, { width: 1008, height: 624 });
      assert.match(done.ocr ?? "", /K7Q2LM/);
    });
  });

  describe("pdf", { skip: noTestbed }, () => {
    it("reads text pages as text", async () => {
      const read = await helper.pdf({
        path: join(testbed, "synthetic/docs/Annual notes 2026.pdf"),
        from: 0,
        to: 50,
        outDir: out,
      });
      assert.equal(read.pages, 3);
      assert.deepEqual(
        read.items.map((item) => item.number),
        [1, 2, 3],
      );
      for (const item of read.items) {
        assert.equal(item.image, undefined);
        assert.equal(item.ocr, undefined);
        assert.ok([...item.text].length >= 200, `page ${item.number}: ${item.text.length} characters`);
        assert.equal(item.text, item.text.trim());
      }
      assert.match(read.items[1].text, /Yoshida/);
      const window = await helper.pdf({
        path: join(testbed, "synthetic/docs/Annual notes 2026.pdf"),
        from: 1,
        to: 2,
        outDir: out,
      });
      assert.deepEqual(
        window.items.map((item) => item.number),
        [2],
      );
    });

    it("renders a scan for the encoder and reads it for keywords", async () => {
      const read = await helper.pdf({
        path: join(testbed, "synthetic/docs/Scan 2026-09-14.pdf"),
        from: 0,
        to: 50,
        outDir: out,
      });
      assert.equal(read.pages, 1);
      const [page] = read.items;
      assert.ok(page.image && existsSync(page.image));
      assert.equal(page.ocr, true);
      assert.match(page.text, /BLUE BOTTLE/);
      const { width, height } = await pictureSize(page.image);
      assert.ok(width % 48 === 0 && height % 48 === 0 && (width / 48) * (height / 48) <= 280, `${width}×${height}`);
    });

    it("replaces Arabic text layers that lost letters with OCR", async () => {
      const read = await helper.pdf({
        path: join(testbed, "synthetic/lang/ar/تقرير.pdf"),
        from: 0,
        to: 50,
        outDir: out,
      });
      assert.equal(read.items.length, 2);
      for (const item of read.items) {
        assert.equal(item.ocr, true);
        assert.equal(item.image, undefined);
      }
      assert.match(read.items[0].text, /المبيعات/);
    });

    it("keeps a glyph-order Bengali page as a picture with its garbled text", async () => {
      const read = await helper.pdf({
        path: join(testbed, "synthetic/lang/bn/বাড়ি ভাড়ার চুক্তি.pdf"),
        from: 0,
        to: 50,
        outDir: out,
      });
      assert.ok(read.items.length > 0);
      for (const item of read.items) {
        assert.equal(item.text, "");
        assert.ok(item.garbled && item.garbled.length > 0);
        assert.ok(item.image && existsSync(item.image));
        assert.equal(item.ocr, undefined);
      }
    });

    it("notices garbled page text (DigUp SearchTextTests)", async () => {
      const check = async (text: string) =>
        (await helper.call<{ problem: string | null }>("pageProblemTest", { text })).problem;
      const glyphOrder =
        "বািড় ভাড়ার চিপ ধানমি ৭ নর রােডর িতন বডরেমর াট মািসক ২৫,০০০ টাকা ভাড়ায় দওয়া হেলা। ভাড়ায়া দুই মােসর";
      const bengali =
        "বাড়ি ভাড়ার চুক্তিপত্র। ধানমন্ডি ৭ নম্বর রোডের তিন বেডরুমের ফ্ল্যাটটি মাসিক ২৫,০০০ টাকা ভাড়ায় দেওয়া হলো।";
      const lost = "ارتفعت ا.بيعات بنسبة خمسة عشر با.ئة في الربع الثالث. زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن.";
      const arabic =
        "ارتفعت المبيعات بنسبة خمسة عشر بالمئة في الربع الثالث. زرنا مدينة البتراء الأثرية في جنوب الأردن.";
      assert.equal(await check(glyphOrder), "glyphOrder");
      assert.equal(await check(bengali), null);
      assert.equal(await check(lost), "lostLetters");
      assert.equal(await check(arabic), null);
      assert.equal(await check("Revenue grew 20%. See p.4?No. Done."), null);
      assert.equal(await check("أ.د.محمد علي، أستاذ في الجامعة. د.خالد و د.سارة من شركة ذ.م.م للتجارة"), null);
      assert.equal(await check("\u{F0B7} Item one of the slide\n".repeat(6)), null);
    });
  });

  describe("rich", { skip: noTestbed }, () => {
    it("reads docx and rtf through the Cocoa text system", async () => {
      const docx = await helper.rich(join(testbed, "synthetic/docs/Vector search notes.docx"), "docx");
      assert.match(docx.text, /cosine similarity search over embedding vectors/);
      const rtf = await helper.rich(join(testbed, "synthetic/docs/Meeting notes.rtf"), "rtf");
      assert.match(rtf.text, /Design review moved to Thursday at 3pm/);
      assert.doesNotMatch(rtf.text, /\\rtf/);
      const bengali = await helper.rich(join(testbed, "synthetic/lang/bn/Sundarbans trip.docx"), "docx");
      assert.ok(bengali.text.trim().length > 0);
    });
  });

  describe("audio (DigUp AudioExtractor.windows)", () => {
    const windows = async (seconds: number, loud?: (t: number) => boolean) => {
      const wav = join(out, `tone-${seconds}-${loud ? "part" : "all"}.wav`);
      writeWav(wav, seconds, loud);
      return helper.audio({ path: wav, outDir: join(out, "pieces") });
    };

    it("cuts 30 s windows every 25 s, with a tail of at least 2 s of new sound", async () => {
      assert.deepEqual(spans((await windows(30)).pieces), [[0, 30]]);
      assert.deepEqual(spans((await windows(40)).pieces), [
        [0, 30],
        [25, 40],
      ]);
      assert.deepEqual(spans((await windows(60)).pieces), [
        [0, 30],
        [25, 55],
        [50, 60],
      ]);
      assert.deepEqual(spans((await windows(31)).pieces), [[0, 30]]); // 1 s past the overlap: no tail
      assert.deepEqual(spans((await windows(32)).pieces), [
        [0, 30],
        [25, 32],
      ]);
      assert.deepEqual(spans((await windows(2)).pieces), [[0, 2]]);
      assert.deepEqual(spans((await windows(1.9)).pieces), []);
      const forty = await windows(40);
      assert.equal(forty.duration, 40);
    });

    it("skips silent windows but keeps counting time", async () => {
      const silent = await windows(10, () => false);
      assert.deepEqual(silent.pieces, []);
      assert.equal(silent.duration, 10);
      assert.deepEqual(spans((await windows(40, (t) => t >= 30)).pieces), [[25, 40]]);
    });

    it("writes 16 kHz mono PCM16 WAV pieces with a 44-byte header", async () => {
      const wav = join(out, "tone-wav-check.wav");
      writeWav(wav, 40);
      const [first] = (await helper.audio({ path: wav, outDir: join(out, "pieces") })).pieces;
      const piece = readFileSync(first.path);
      assert.equal(piece.length, 44 + 30 * 16000 * 2);
      assert.equal(piece.toString("ascii", 0, 4), "RIFF");
      assert.equal(piece.readUInt32LE(4), piece.length - 8);
      assert.equal(piece.toString("ascii", 8, 16), "WAVEfmt ");
      assert.deepEqual(
        [piece.readUInt16LE(20), piece.readUInt16LE(22), piece.readUInt32LE(24), piece.readUInt16LE(34)],
        [1, 1, 16000, 16],
      );
      assert.equal(piece.toString("ascii", 36, 40), "data");
      assert.equal(piece.readUInt32LE(40), 30 * 16000 * 2);
      assert.ok(piece.subarray(44, 44 + 4000).equals(readFileSync(wav).subarray(44, 44 + 4000)));
    });

    it("follows DigUp's rules on the testbed's recordings (all under 30 s)", { skip: noTestbed }, async () => {
      const folder = join(testbed, "synthetic/audio");
      for (const name of readdirSync(folder).filter((name) => name.endsWith(".wav"))) {
        const read = await helper.audio({ path: join(folder, name), outDir: join(out, "pieces") });
        assert.ok(read.duration > 0, name);
        if (read.duration < 2) {
          assert.deepEqual(read.pieces, [], name); // DigUp: "silent or shorter than 2 s"
        } else {
          assert.equal(read.pieces.length, 1, name);
          assert.equal(read.pieces[0].start, 0, name);
          assert.ok(
            Math.abs(read.pieces[0].end - read.duration) < 0.01,
            `${name}: ${read.pieces[0].end} vs ${read.duration}`,
          );
        }
      }
    });
  });

  describe("video (DigUp VideoTests)", () => {
    const shots = join(fixtures, "videos/shots.ts");

    it("keeps one frame per shot, timed when it's shown", async () => {
      const read = await helper.video({ path: shots, outDir: join(out, "frames"), maxPixel: 320 });
      const colors: string[] = [];
      for (const frame of read.frames) colors.push((await quadrants(frame.path)).colors[0]);
      assert.deepEqual(colors, ["R", "G", "B"]);
      read.frames.forEach((frame, shot) => {
        assert.ok(shot * 4 <= frame.start && frame.start < (shot + 1) * 4, `${colors[shot]} at ${frame.start} s`);
      });
      // Each frame stands for the stretch until the next kept one; the last until the end.
      for (let i = 0; i + 1 < read.frames.length; i++) assert.equal(read.frames[i].end, read.frames[i + 1].start);
      assert.equal(read.frames[read.frames.length - 1].end, read.duration);
      // Sized for 70 tokens: 320×192 becomes 480×288.
      assert.deepEqual(await pictureSize(read.frames[0].path), { width: 480, height: 288 });
      assert.deepEqual(read.pieces, []); // no sound
    });

    for (const [seconds, color] of [
      [1, "R"],
      [5, "G"],
      [6.5, "G"],
      [9, "B"],
      [11.5, "B"],
    ] as const) {
      it(`previews the moment at ${seconds} s`, async () => {
        const jpg = join(out, `moment-${seconds}.jpg`);
        const thumb = await helper.thumb({ path: shots, out: jpg, maxPixel: 320, time: seconds });
        assert.equal(thumb.path, jpg);
        assert.equal((await quadrants(jpg)).colors[0], color);
      });
    }

    it("reads a video without sound", { skip: noTestbed }, async () => {
      const read = await helper.video({
        path: join(testbed, "synthetic/video/penguin_zebra_parrot_18s.mp4"),
        outDir: join(out, "frames"),
      });
      assert.ok(read.duration > 17 && read.duration < 19, String(read.duration));
      assert.ok(read.frames.length >= 2);
      assert.ok(read.frames.every((frame) => existsSync(frame.path)));
      assert.deepEqual(read.pieces, []);
    });

    it("falls back to ffmpeg for what AVFoundation can't open", async (t) => {
      const ffmpeg = findTool("ffmpeg");
      if (!ffmpeg || !findTool("ffprobe")) return t.skip("ffmpeg isn't installed");
      // Two 4 s shots (red left half, then green top half) and a tone, in Matroska.
      const clip = join(out, "clip.mkv");
      const shot = (box: string) => `color=black:s=320x192:r=5:d=4,drawbox=${box}:t=fill`;
      execFileSync(ffmpeg, [
        "-v", "error", "-y",
        "-f", "lavfi", "-i", shot("w=160:h=192:color=0xFF0000"),
        "-f", "lavfi", "-i", shot("w=320:h=96:color=0x00FF00"),
        "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
        "-filter_complex", "[0][1]concat=n=2:v=1:a=0[v]", "-map", "[v]", "-map", "2",
        "-c:v", "mpeg4", "-q:v", "2", "-c:a", "flac", clip,
      ]); // prettier-ignore
      const read = await helper.video({ path: clip, outDir: join(out, "frames") });
      assert.ok(
        log.lines.some((line) => line.includes("video: ffmpeg reads clip.mkv")),
        log.lines.join("\n"),
      );
      assert.ok(
        log.lines.some((line) => line.includes("audio: ffmpeg reads clip.mkv")),
        log.lines.join("\n"),
      );
      // Frames at 0.5, 3.5 (the same shot: dropped) and 6.5 s.
      assert.deepEqual(
        read.frames.map((frame) => frame.start),
        [0.5, 6.5],
      );
      const colors: string[] = [];
      for (const frame of read.frames) colors.push((await quadrants(frame.path)).colors[0]);
      assert.deepEqual(colors, ["R", "G"]);
      assert.equal(read.frames[0].end, 6.5);
      assert.equal(read.frames[1].end, read.duration);
      assert.equal(read.pieces.length, 1);
      assert.equal(read.pieces[0].start, 0);
      assert.ok(Math.abs(read.pieces[0].end - 8) < 0.1, String(read.pieces[0].end));
      const jpg = join(out, "clip-6.jpg");
      await helper.thumb({ path: clip, out: jpg, maxPixel: 320, time: 6 });
      assert.equal((await quadrants(jpg)).colors[0], "G");

      // A file ffmpeg reads that has no sound isn't a failure: no pieces, as for an mp4 without sound.
      const silent = join(out, "silent.mkv");
      execFileSync(ffmpeg, [
        "-v",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        shot("w=160:h=192:color=0xFF0000"),
        "-c:v",
        "mpeg4",
        silent,
      ]);
      assert.deepEqual(await helper.audio({ path: silent, outDir: join(out, "pieces") }), { duration: 0, pieces: [] });
      const video = await helper.video({ path: silent, outDir: join(out, "frames") });
      assert.equal(video.frames.length, 1);
      assert.deepEqual(video.pieces, []);
    });
  });

  // DigUp marks these failed (AVFoundation's track list throws); the ffmpeg fallback must not turn them into files
  // with nothing in them ("skipped").
  describe("unreadable audio and video", () => {
    it("fails files that neither macOS nor ffmpeg can read", async () => {
      const folder = tempDir();
      const empty = join(folder, "empty.wav");
      writeFileSync(empty, "");
      const junk = join(folder, "junk.mp3");
      writeFileSync(junk, "not a recording, just words. ".repeat(10));
      // An mp4 cut before its index (moov): the ftyp box, then the start of the media data.
      const cut = join(folder, "cut.mp4");
      const ftyp = Buffer.from("000000186674797069736f6d0000020069736f6d6d703431", "hex");
      const mdat = Buffer.concat([Buffer.from("000100006d646174", "hex"), Buffer.alloc(4096, 0x5a)]);
      writeFileSync(cut, Buffer.concat([ftyp, mdat]));
      for (const path of [empty, junk, cut]) {
        await rejectsWith(helper.audio({ path, outDir: join(out, "pieces") }), "op", /^unreadable: /);
        await rejectsWith(helper.video({ path, outDir: join(out, "frames") }), "op", /^unreadable: /);
      }
    });

    it(
      "fails files it has no permission to read",
      { skip: process.getuid?.() === 0 ? "root reads everything" : false },
      async () => {
        const folder = tempDir();
        const wav = join(folder, "locked.wav");
        copyFileSync(join(fixtures, "reference/speech.wav"), wav);
        const video = join(folder, "locked.ts");
        copyFileSync(join(fixtures, "videos/shots.ts"), video);
        chmodSync(wav, 0);
        chmodSync(video, 0);
        await rejectsWith(helper.audio({ path: wav, outDir: join(out, "pieces") }), "op", /^unreadable: /);
        await rejectsWith(helper.video({ path: video, outDir: join(out, "frames") }), "op", /^unreadable: /);
      },
    );
  });

  describe("estimate (DigUp Estimator.pages, Estimator.duration)", () => {
    it("measures recordings, and 0 for what it can't", async () => {
      const wav = join(out, "estimate-40.wav");
      writeWav(wav, 40);
      const junk = join(out, "estimate-junk.mp3");
      writeFileSync(junk, "not a recording, just words. ".repeat(10));
      const [tone, shots, none] = await helper.durations([wav, join(fixtures, "videos/shots.ts"), junk]);
      assert.equal(tone, 40);
      assert.ok(shots > 11 && shots < 12.5, String(shots));
      assert.equal(none, 0);
    });

    it("counts PDF pages, and 1 for what it can't", { skip: noTestbed }, async () => {
      const pdf = join(testbed, "synthetic/docs/Annual notes 2026.pdf");
      assert.deepEqual(await helper.pages([pdf, join(fixtures, "reference/speech.wav")]), [3, 1]);
    });
  });

  describe("walk", () => {
    const skip = { skip: noTestbed };
    const traps = join(testbed, "traps");
    const walk = (args: Partial<WalkArgs> & { roots: string[] }): Promise<WalkResult> =>
      helper.walk({
        skipNames: developerFolders,
        skipSuffixes: [".noindex"],
        excluded: [],
        home: homedir(),
        code: false,
        ...args,
      });
    const under = (result: WalkResult, folder: string) =>
      result.files.filter((file) => file.path.startsWith(folder + "/"));
    const file = (result: WalkResult, path: string) =>
      result.files.find((entry) => entry.path.normalize("NFC") === path.normalize("NFC"));

    it("walks the traps as DigUp's crawler does", skip, async () => {
      const result = await walk({ roots: [traps] });
      assert.deepEqual(under(result, join(traps, "Fake.app")), []);
      assert.deepEqual(under(result, join(traps, ".hidden")), []);
      assert.deepEqual(under(result, join(traps, "node_modules")), []);
      assert.deepEqual(under(result, join(traps, "MyProject/node_modules")), []);
      assert.deepEqual(result.skipped, { "app or bundle": 1, "developer folder": 2 });
      assert.deepEqual(result.dirs, [{ path: join(traps, "MyProject"), projectRoot: true, gitDir: "dir" }]);
      assert.equal(file(result, join(traps, "real-mpeg-ts/zoo clip.ts"))?.type, "movie");
      // macOS types .ts and .mts as MPEG-2 transport streams (DigUp: "Spotlight types 57k TypeScript files as
      // movies"). Telling TypeScript from video takes the 600-byte sniff, which is engine/rules.ts's (Rules.classify).
      assert.equal(file(result, join(traps, "ts-code/app.ts"))?.type, "movie");
      assert.equal(file(result, join(traps, "ts-code/main.mts"))?.type, "movie");
      assert.equal(file(result, join(traps, "MyProject/package.json"))?.type, null);
      assert.ok(under(result, join(traps, "dataset_clips")).every((entry) => entry.type === "audio"));
      const named = join(traps, "Names with spaces & ünïcödé");
      // macOS names screenshots with a narrow no-break space before "PM".
      assert.equal(file(result, join(named, "Screenshot 2026-10-05 at 9.41.07\u202FPM.png"))?.screenshotMarker, true);
      assert.equal(file(result, join(named, "Café menü — 日本語.jpg"))?.screenshotMarker, false);
      for (const entry of result.files) {
        assert.ok(entry.size > 0 && entry.mtime > 1e9 && entry.inode > 0 && entry.device !== 0, entry.path);
        assert.equal(entry.regular, true, entry.path);
        assert.equal(entry.dataless, false, entry.path);
        assert.equal(entry.inCloud, false, entry.path);
      }
      const [hero] = under(result, join(traps, "MyProject/assets"));
      const stat = statSync(hero.path);
      assert.deepEqual([hero.size, hero.inode], [stat.size, stat.ino]);
      assert.ok(Math.abs(hero.mtime - stat.mtimeMs / 1000) < 0.001);
    });

    it("walks into folders that aren't in skipNames", skip, async () => {
      const result = await walk({ roots: [traps], skipNames: [] });
      assert.ok(under(result, join(traps, "node_modules")).length > 0);
      assert.deepEqual(result.skipped, { "app or bundle": 1 });
    });

    it("leaves out excluded folders inside a root, but walks a root chosen inside one", skip, async () => {
      const project = join(traps, "MyProject");
      const excluded = await walk({ roots: [traps], excluded: [project] });
      assert.deepEqual(under(excluded, project), []);
      assert.equal(excluded.skipped["excluded folder"], 1);
      const chosen = await walk({ roots: [traps, project], excluded: [project] });
      assert.ok(under(chosen, project).length > 0);
    });

    it("finds the screenshot marker", skip, async () => {
      const result = await walk({ roots: [join(testbed, "synthetic/screenshots")] });
      assert.equal(result.files.length, 6);
      for (const entry of result.files)
        assert.deepEqual([entry.type, entry.screenshotMarker], ["image", true], entry.path);
    });

    it("reports projects, git folders and links, and applies the code folder rules", async () => {
      const root = tempDir();
      const write = (path: string, text = "print('hi')\n") => {
        mkdirSync(join(root, path, ".."), { recursive: true });
        writeFileSync(join(root, path), text);
      };
      mkdirSync(join(root, "repo/.git"), { recursive: true });
      write("repo/app.py");
      write("repo/build/out.py");
      write("repo/vendor/lib.py");
      write("sub/.git", "gitdir: ../repo/.git/modules/sub\n");
      write("sub/b.py");
      mkdirSync(join(root, "Tool/Tool.xcodeproj"), { recursive: true });
      write("Tool/main.swift");
      write("notes/.secret.py");
      write("notes/todo.txt", "milk\n");
      symlinkSync(join(root, "repo/app.py"), join(root, "notes/link.py"));

      const main = await walk({ roots: [root] });
      const dirs = Object.fromEntries(
        main.dirs.map((dir) => [dir.path.slice(root.length + 1), [dir.projectRoot, dir.gitDir]]),
      );
      assert.deepEqual(dirs, { repo: [true, "dir"], sub: [true, "file"], Tool: [true, null] });
      assert.equal(file(main, join(root, "repo/app.py"))?.type, "sourceCode");
      assert.equal(file(main, join(root, "notes/link.py"))?.regular, false);
      assert.equal(file(main, join(root, "notes/.secret.py")), undefined);
      assert.ok(file(main, join(root, "repo/build/out.py")));

      const code = await walk({ roots: [root], code: true });
      assert.equal(code.skipped["vendored or built code"], 2);
      assert.equal(code.skipped["submodule or worktree"], 1);
      assert.deepEqual(under(code, join(root, "repo/build")), []);
      assert.deepEqual(under(code, join(root, "sub")), []);
      assert.deepEqual(code.dirs, [{ path: join(root, "repo"), projectRoot: false, gitDir: "dir" }]);
    });
  });

  describe("thumb", () => {
    it("makes pictures of pictures, never enlarged", async () => {
      const small = await helper.thumb({
        path: join(fixtures, "reference/photo.jpg"),
        out: join(out, "photo.jpg"),
        maxPixel: 256,
      });
      assert.deepEqual([small.width, small.height], [256, 192]);
      const big = await helper.thumb({
        path: join(fixtures, "reference/screen.png"),
        out: join(out, "screen.jpg"),
        maxPixel: 4000,
      });
      assert.deepEqual([big.width, big.height], [1440, 900]);
    });

    it("shows a PDF page, and the band around a marked word", { skip: noTestbed }, async () => {
      const pdf = join(testbed, "synthetic/docs/Annual notes 2026.pdf");
      const page = await helper.thumb({ path: pdf, out: join(out, "page.png"), maxPixel: 600, page: 2 });
      assert.equal(Math.max(page.width, page.height), 600);
      assert.ok(page.height > page.width);
      const png = join(out, "band.png");
      const band = await helper.thumb({ path: pdf, out: png, maxPixel: 600, page: 2, words: ["Yoshida"] });
      assert.equal(band.width, 600);
      assert.ok(Math.abs(band.height - 400) <= 1, String(band.height)); // as wide as the page, 2:3 as high
      const points: number[][] = [];
      for (let y = 0; y < band.height; y += 4) for (let x = 0; x < band.width; x += 4) points.push([x, y]);
      const { rgb } = await helper.call<{ rgb: number[][] }>("pixelsTest", { path: png, points });
      assert.ok(
        rgb.some(([r, g, b]) => r > 200 && g > 150 && b < 100),
        "no yellow mark on the page",
      );
    });

    it("draws a waveform with the matched stretch lit", { skip: noTestbed }, async () => {
      const png = join(out, "wave.png");
      const wave = await helper.thumb({
        path: join(testbed, "synthetic/audio/speech_cake_recipe.wav"),
        out: png,
        maxPixel: 400,
        range: [5, 12],
      });
      assert.deepEqual([wave.width, wave.height], [400, 150]);
      // 100 bars over 29.2 s: bar 27 (7.9 s) is lit, bar 68 (19.9 s) isn't. Bars are 3 px wide, 4 px apart.
      const { rgb } = await helper.call<{ rgb: number[][] }>("pixelsTest", {
        path: png,
        points: [
          [27 * 4 + 1, 75],
          [68 * 4 + 1, 75],
        ],
      });
      const [lit, plain] = rgb;
      assert.ok(lit[0] > 200 && lit[1] > 120 && lit[1] < 200 && lit[2] < 90, `lit ${lit}`);
      assert.ok(Math.abs(plain[0] - plain[2]) < 10 && plain[0] > 90 && plain[0] < 170, `plain ${plain}`);
    });

    it(
      "shows the file's own picture when the moment can't be drawn (DigUp: Previews.load)",
      { skip: noTestbed },
      async () => {
        const jpg = join(out, "past-the-end.jpg");
        const video = join(testbed, "synthetic/video/penguin_zebra_parrot_18s.mp4"); // 18 s long
        const thumb = await helper.thumb({ path: video, out: jpg, maxPixel: 320, time: 99 });
        assert.ok(thumb.width > 0 && thumb.height > 0 && Math.max(thumb.width, thumb.height) <= 320);
        assert.ok(statSync(jpg).size > 0);
        assert.ok(
          log.lines.some((line) => line.includes("showing the picture of penguin_zebra_parrot_18s.mp4")),
          log.lines.join("\n"),
        );
      },
    );
  });

  describe("open (pure parts only: opening launches apps)", () => {
    it("picks the landmark word as DigUp's Landmark.find does", async () => {
      const find = async (page: number, texts: string[], words: string[]) =>
        (await helper.call<{ word: string | null }>("landmarkTest", { page, texts, words })).word;
      const pages = [
        "Quarterly business review\nRevenue grew in Japan and Europe.",
        "Hiking trip to Mount Fuji\nWe took the Yoshida trail from the fifth station in Japan.",
      ];
      assert.equal(await find(2, pages, ["japan", "Yoshida"]), "Yoshida");
      assert.equal(await find(2, pages, ["japan", "bread"]), "Japan");
      assert.equal(await find(2, pages, ["bread"]), null);
      assert.equal(await find(1, pages, ["japan"]), null);
      const arabic = ["التقرير الربعي", "رحلة إلى البتراء\nزرنا مدينة البتراء الأثرية في جنوب الأردن"];
      assert.equal(await find(2, arabic, ["الاردن"]), "الأردن");
      const garbled = ["التقرير الربعي", "زرنا مدينة البتراء ا?ثرية في جنوب ا?ردن"];
      assert.equal(await find(2, garbled, ["الاردن"]), null);
    });
  });
});

describe("Helper client", () => {
  // A stand-in helper: answers in order with its pid; "hang" never answers, "crash" exits, "fail" answers ok:false,
  // "bloat" exits as the helper's memory watchdog does, "big" and "junk" break the protocol, "unparsed" answers as the
  // helper does a request it can't parse, "args" tells its command line.
  const script = `#!/bin/bash
while IFS= read -r line; do
  id=$(sed -E 's/.*"id":([0-9]+).*/\\1/' <<<"$line")
  op=$(sed -E 's/.*"op":"([A-Za-z]+)".*/\\1/' <<<"$line")
  case "$op" in
    hang) exec sleep 600 ;;
    crash) echo "going down" >&2; exit 3 ;;
    fail) printf '{"id":%s,"ok":false,"error":"no good"}\\n' "$id" ;;
    bloat) echo "digup-helper: watchdog: needed more than 0 MB of memory to read: /x" >&2; exit 75 ;;
    big) head -c 2048 /dev/zero | tr '\\0' 'x'; echo ;;
    junk) echo "not json" ;;
    unparsed) printf '{"id":0,"ok":false,"error":"bad request"}\\n' ;;
    args) printf '{"id":%s,"ok":true,"args":"%s"}\\n' "$id" "$*" ;;
    *) printf '{"id":%s,"ok":true,"op":"%s","pid":%s}\\n' "$id" "$op" "$$" ;;
  esac
done
`;
  let fake: string;
  const helpers: Helper[] = [];
  const make = (options?: ConstructorParameters<typeof Helper>[2], path = fake) => {
    const made = new Helper(path, recordingLog(), options);
    helpers.push(made);
    return made;
  };
  type Answer = { op: string; pid: number };

  before(() => {
    fake = join(tempDir(), "fake-helper");
    writeFileSync(fake, script);
    chmodSync(fake, 0o755);
  });
  after(async () => {
    for (const made of helpers) await made.close();
  });

  it("gives a file 15 minutes by default, as DigUp's watchdog does", () => {
    assert.equal(DEFAULT_OP_TIMEOUT_MS, 15 * 60_000);
  });

  it("answers requests one at a time, in order", async () => {
    const client = make();
    const answers = await Promise.all(["one", "two", "three"].map((op) => client.call<Answer>(op)));
    assert.deepEqual(
      answers.map((answer) => answer.op),
      ["one", "two", "three"],
    );
    assert.equal(new Set(answers.map((answer) => answer.pid)).size, 1);
    await rejectsWith(client.call("fail"), "op", /no good/);
  });

  it("restarts after a timeout and goes on with the queue", async () => {
    const client = make();
    const { pid } = await client.call<Answer>("ping");
    const [hung, next] = await Promise.allSettled([
      client.call("hang", {}, { timeoutMs: 300 }),
      client.call<Answer>("ping"),
    ]);
    assert.equal(hung.status, "rejected");
    const reason = (hung as PromiseRejectedResult).reason as HelperError;
    assert.deepEqual([reason.kind, reason.message], ["timeout", "took more than 0 seconds to read"]);
    assert.equal(next.status, "fulfilled");
    assert.notEqual((next as PromiseFulfilledResult<Answer>).value.pid, pid);
  });

  it("restarts after the helper dies", async () => {
    const client = make();
    await rejectsWith(client.call("crash"), "crashed", /exited with code 3: going down/);
    assert.equal((await client.call<Answer>("ping")).op, "ping");
  });

  it("reports a helper its watchdog stopped as out of memory, and starts a new one", async () => {
    const client = make({ memoryLimit: 1 });
    await rejectsWith(
      client.call("bloat", {}, { timeoutMs: 10_000 }),
      "memory",
      /^needed more than 0 MB of memory to read$/,
    );
    assert.equal((await client.call<Answer>("ping")).op, "ping");
  });

  it("passes the memory limit and libmtmd to the helper", async () => {
    const args = (
      await make({ memoryLimit: 5 * 1024 ** 3, mtmdLibrary: "/llama/libmtmd.dylib" }).call<{ args: string }>("args")
    ).args;
    assert.equal(args, `serve --memory-limit ${5 * 1024 ** 3} --mtmd /llama/libmtmd.dylib`);
    assert.match((await make().call<{ args: string }>("args")).args, /^serve --memory-limit \d+$/);
  });

  it("fails a reply too large to read instead of crashing, and restarts", async () => {
    const client = make({ maxReplyBytes: 1024 });
    const { pid } = await client.call<Answer>("ping");
    await rejectsWith(client.call("big", {}, { timeoutMs: 10_000 }), "op", /too large/);
    assert.notEqual((await client.call<Answer>("ping")).pid, pid);
  });

  it("fails a reply that isn't JSON, and restarts", async () => {
    const client = make();
    const { pid } = await client.call<Answer>("ping");
    await rejectsWith(client.call("junk", {}, { timeoutMs: 10_000 }), "op", /could not be read/);
    assert.notEqual((await client.call<Answer>("ping")).pid, pid);
  });

  it("takes an id-0 failure as the answer to the request in flight", async () => {
    const client = make();
    const { pid } = await client.call<Answer>("ping");
    const began = Date.now();
    await rejectsWith(client.call("unparsed", {}, { timeoutMs: 10_000 }), "op", /bad request/);
    assert.ok(Date.now() - began < 2000);
    assert.equal((await client.call<Answer>("ping")).pid, pid);
  });

  it("reports a missing binary", async () => {
    await rejectsWith(make({}, join(tempDir(), "no-such-helper")).call("ping"), "spawn", /missing/);
  });

  it("drops a queued request whose signal aborts; the one in flight and the rest go on", async () => {
    const client = make();
    const hung = client.call("hang", {}, { timeoutMs: 400 }).catch((error) => error);
    const gone = new AbortController();
    const dropped = client.call<Answer>("dropped", {}, { signal: gone.signal });
    const next = client.call<Answer>("next");
    const began = Date.now();
    gone.abort(new Error("the preview moved on"));
    await assert.rejects(dropped, /the preview moved on/);
    assert.ok(Date.now() - began < 200, "at once, not after the request in flight");
    assert.equal(((await hung) as HelperError).kind, "timeout");
    assert.equal((await next).op, "next");
    // An already aborted signal never queues.
    await assert.rejects(client.call("ping", {}, { signal: AbortSignal.abort(new Error("late")) }), /late/);
  });

  it("fails queued and later calls once closed", async () => {
    const client = make();
    const hung = client.call("hang", {}, { timeoutMs: 10_000 });
    const queued = client.call("ping");
    const failed = [rejectsWith(hung, "closed"), rejectsWith(queued, "closed")];
    await new Promise((done) => setTimeout(done, 100));
    await client.close();
    await Promise.all(failed);
    await rejectsWith(client.call("ping"), "closed");
  });
});
