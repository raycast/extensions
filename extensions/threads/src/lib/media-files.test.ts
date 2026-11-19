import { mkdtemp, open, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertMediaResponse, convertImage, extensionFor, redactUrl, reservePath } from "./media-files";

// An owned directory per run. A fixed path lets two concurrent runs delete each other's
// fixtures mid-test, which fails in a way that looks like a code defect.
let SCRATCH = "";

const ls = async () => (await readdir(SCRATCH)).sort();

beforeEach(async () => {
  SCRATCH = await mkdtemp(join(tmpdir(), "raycast-threads-test-"));
});
afterEach(async () => {
  // afterAll would only remove the last one, leaving a directory per test behind every run.
  await rm(SCRATCH, { recursive: true, force: true });
});

/** `sips` is macOS-only, so the real-conversion cases are too. */
const onMac = process.platform === "darwin";

/**
 * A real 2×2 PNG, inline so the fixture is hermetic.
 *
 * An earlier version built the fixture by asking `sips` to convert a system wallpaper and
 * bailed out of the test when that failed — which it did (`sips` exits 13 on that source),
 * so the overwrite test reported a green tick while asserting nothing. No skip path here on
 * purpose: if `sips` can't convert this, the test must fail and say so.
 */
const PNG_2X2 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==";

async function writePng(path: string): Promise<void> {
  await writeFile(path, Buffer.from(PNG_2X2, "base64"));
}

describe("reservePath", () => {
  // These guard the paths that can destroy a file the user already had, so they run against
  // a real directory — the reservation semantics are the whole point and cannot be faked.
  it("never hands back a name that already exists", async () => {
    await writeFile(`${SCRATCH}/a.mp4`, "PRECIOUS");

    const reserved = await reservePath(SCRATCH, "a", "mp4");
    await reserved.handle.close();

    expect(reserved.filePath).toBe(`${SCRATCH}/a (1).mp4`);
    // Reserving only the `.part` used to let the later rename() overwrite this silently.
    expect(await readFile(`${SCRATCH}/a.mp4`, "utf8")).toBe("PRECIOUS");
  });

  it("claims the final name too, so a concurrent run gets a different one", async () => {
    const first = await reservePath(SCRATCH, "b", "jpg");
    await first.handle.close();
    const second = await reservePath(SCRATCH, "b", "jpg");
    await second.handle.close();

    expect(second.filePath).not.toBe(first.filePath);

    // The names alone don't prove it: an implementation reserving only the `.part` also
    // yields two different names. What matters is that the FINAL paths are both taken, so
    // a later rename() cannot land on someone else's file.
    for (const path of [first.filePath, second.filePath]) {
      await expect(open(path, "wx")).rejects.toMatchObject({ code: "EEXIST" });
    }
  });
});

describe("convertImage", () => {
  it.skipIf(!onMac)("never overwrites an existing file of the target name", async () => {
    await writePng(`${SCRATCH}/c.png`);
    await writeFile(`${SCRATCH}/c.jpg`, "PRECIOUS");

    const result = await convertImage(`${SCRATCH}/c.png`, "jpeg");

    expect(result.skipped).toBeUndefined();
    // Byte equality, not just the name: a truncating implementation passes a name check.
    expect(await readFile(`${SCRATCH}/c.jpg`, "utf8")).toBe("PRECIOUS");
    expect(result.path).toBe(`${SCRATCH}/c (1).jpg`);
    // The original is consumed once it has been converted.
    expect(await ls()).toEqual(["c (1).jpg", "c.jpg"]);
  });

  it.skipIf(!onMac)("returns a path that actually exists", async () => {
    await writePng(`${SCRATCH}/e.png`);

    const result = await convertImage(`${SCRATCH}/e.png`, "jpeg");

    expect(result.path).toBe(`${SCRATCH}/e.jpg`);
    expect(await readFile(result.path)).toBeInstanceOf(Buffer);
  });

  it.skipIf(!onMac)("keeps the original and leaves no .part behind when sips refuses the file", async () => {
    await writeFile(`${SCRATCH}/bad.webp`, "not an image");

    const result = await convertImage(`${SCRATCH}/bad.webp`, "png");

    expect(result.path).toBe(`${SCRATCH}/bad.webp`);
    expect(result.skipped).toMatch(/sips failed/);
    expect(await readFile(`${SCRATCH}/bad.webp`, "utf8")).toBe("not an image");
    expect(await ls()).toEqual(["bad.webp"]);
  });

  it("is a no-op for the original format", async () => {
    await writeFile(`${SCRATCH}/d.webp`, "x");

    const result = await convertImage(`${SCRATCH}/d.webp`, "original");

    expect(result).toEqual({ path: `${SCRATCH}/d.webp` });
    expect(await ls()).toEqual(["d.webp"]);
  });

  it("leaves a file that is already in the requested format alone", async () => {
    // The reported bug: Threads serves image/jpeg, so the download lands as `.jpg`; asking
    // for JPEG then reserved a target next to it and produced `name (1).jpg`, deleting the
    // original. Converting a format to itself must be a no-op.
    await writePng(`${SCRATCH}/h.jpg`);

    const result = await convertImage(`${SCRATCH}/h.jpg`, "jpeg");

    expect(result.path).toBe(`${SCRATCH}/h.jpg`);
    expect(result.skipped).toMatch(/already jpg/);
    expect(await ls()).toEqual(["h.jpg"]);
  });

  it.skipIf(!onMac)("still converts when the format genuinely differs", async () => {
    await writePng(`${SCRATCH}/i.jpg`);

    const result = await convertImage(`${SCRATCH}/i.jpg`, "png");

    expect(result.skipped).toBeUndefined();
    expect(result.path).toBe(`${SCRATCH}/i.png`);
    expect(await ls()).toEqual(["i.png"]);
  });

  it("says so when asked for a format it does not handle", async () => {
    await writeFile(`${SCRATCH}/f.webp`, "x");

    // Without a reason the caller would log a conversion that never happened.
    const result = await convertImage(`${SCRATCH}/f.webp`, "tiff");

    expect(result.path).toBe(`${SCRATCH}/f.webp`);
    expect(result.skipped).toMatch(/unknown format/);
  });

  it.skipIf(onMac)("keeps the original off macOS, where sips does not exist", async () => {
    await writeFile(`${SCRATCH}/g.webp`, "x");

    const result = await convertImage(`${SCRATCH}/g.webp`, "jpeg");

    expect(result.path).toBe(`${SCRATCH}/g.webp`);
    expect(result.skipped).toMatch(/macOS only/);
    // Deleting the original would otherwise pass this test.
    expect(await readFile(`${SCRATCH}/g.webp`, "utf8")).toBe("x");
  });
});

describe("reading the server's headers", () => {
  it("accepts any media type and rejects anything else", () => {
    for (const accepted of ["image/webp; charset=binary", "VIDEO/MP4;codecs=avc1", "audio/mpeg"]) {
      expect(() => assertMediaResponse(accepted)).not.toThrow();
    }
    // An expired signed URL can answer 200 with an HTML error page; writing that to disk as
    // .mp4 and reporting success is worse than failing.
    for (const rejected of [null, "", "text/html", "application/json", "imagex/foo"]) {
      expect(() => assertMediaResponse(rejected)).toThrow();
    }
  });

  it("takes the extension from the content type, not the URL", () => {
    // The URL lies and the format varies per post — WebP on some, JPEG on others.
    expect(extensionFor("image/webp", "image")).toBe("webp");
    expect(extensionFor("image/webp; charset=binary", "image")).toBe("webp");
    expect(extensionFor("image/jpeg", "image")).toBe("jpg");
    expect(extensionFor("video/mp4", "video")).toBe("mp4");
    expect(extensionFor(null, "image")).toBe("jpg");
    expect(extensionFor(null, "video")).toBe("mp4");
  });

  it("files a voice post as audio even though Threads serves it as video/mp4", () => {
    // The header says video; the payload says audio, and the payload is right — the bytes
    // are AAC in an M4A container with no video track. Trusting the header files every
    // voice post as a video.
    expect(extensionFor("video/mp4", "audio")).toBe("m4a");
    expect(extensionFor(null, "audio")).toBe("m4a");
    // A real audio content type still wins within the audio kind.
    expect(extensionFor("audio/mpeg", "audio")).toBe("mp3");
    expect(extensionFor("audio/mp4", "audio")).toBe("m4a");
    // Raw AAC is an ADTS stream, not an MP4 container.
    expect(extensionFor("audio/aac", "audio")).toBe("aac");
    // The override is only for video/mp4 — an honestly-declared container is kept.
    expect(extensionFor("audio/webm", "audio")).toBe("weba");
    expect(extensionFor("video/webm", "audio")).toBe("webm");
  });
});

describe("redactUrl", () => {
  it("strips the signature from a signed CDN URL", () => {
    const signed = "https://cdn.example/o1/v/t16/f2/m84/AQ.mp4?oh=00_SECRET&oe=6AA62B86&_nc_ht=x";
    expect(redactUrl(signed)).toBe("https://cdn.example/o1/v/t16/f2/m84/AQ.mp4");
  });

  it("does not pass through something it cannot parse", () => {
    expect(redactUrl("not a url")).toBe("(unparseable url)");
  });
});
