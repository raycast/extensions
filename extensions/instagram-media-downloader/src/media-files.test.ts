import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertMediaResponse,
  extensionFor,
  mediaBasename,
  redactUrl,
  releaseReservation,
  reservePath,
} from "./media-files";

/**
 * The downloader API wraps every Instagram CDN URL in a signed JWT on d.rapidcdn.app. The
 * payload's `filename` is the only stable identity: two wrappers for the same image carry
 * different signatures. Shape observed 2026-10-27 for /p/De_XnTMAStE/.
 */
function wrapped(mediaId: string, signature: string, ext = "jpg"): string {
  const payload = Buffer.from(
    JSON.stringify({
      url: `https://scontent-ams4-1.cdninstagram.com/v/t51/${mediaId}_n.${ext}?stp=dst-jpg_e35&oh=SECRET`,
      filename: `snapsave-app_${mediaId}_462153946.${ext}`,
    }),
  ).toString("base64url");
  return `https://d.rapidcdn.app/v2?token=eyJ0eXAiOiJKV1QifQ.${payload}.${signature}`;
}

describe("mediaBasename", () => {
  it("names a single item after the post", () => {
    expect(mediaBasename("De_XnTMAStE", 0, 1)).toBe("De_XnTMAStE");
  });

  it("numbers carousel items from 1, in order", () => {
    expect([0, 1, 2, 3].map((i) => mediaBasename("De_XnTMAStE", i, 4))).toEqual([
      "De_XnTMAStE-1",
      "De_XnTMAStE-2",
      "De_XnTMAStE-3",
      "De_XnTMAStE-4",
    ]);
  });
});

describe("extensionFor", () => {
  it("trusts a declared media type over the URL", () => {
    expect(extensionFor("image/webp", wrapped("1", "a", "jpg"))).toBe("webp");
    expect(extensionFor("video/mp4; charset=binary", "https://example.com/x")).toBe("mp4");
  });

  it("falls back to the token's filename when the CDN sends octet-stream", () => {
    // d.rapidcdn.app serves every file as application/octet-stream (observed 2026-10-27).
    expect(extensionFor("application/octet-stream", wrapped("1", "a", "jpg"))).toBe("jpg");
    expect(extensionFor("application/octet-stream", wrapped("1", "a", "mp4"))).toBe("mp4");
  });

  it("refuses to name a file with anything but a media extension, whatever the server says", () => {
    // A downloader that answered with a link to a script must not put one in Downloads.
    expect(() => extensionFor("application/octet-stream", "https://cdn.example/setup.pkg")).toThrow(/not a media file/);
    expect(() => extensionFor("image/svg+xml", "https://cdn.example/page.html")).toThrow(/not a media file/);
    expect(extensionFor("application/octet-stream", "https://cdn.example/clip.MOV")).toBe("mov");
  });
});

describe("assertMediaResponse", () => {
  it("accepts media types and the CDN's octet-stream", () => {
    for (const type of ["image/jpeg", "video/mp4", "audio/mp4", "application/octet-stream"]) {
      expect(() => assertMediaResponse(type)).not.toThrow();
    }
  });

  it("rejects an HTML or JSON error page served with a 200", () => {
    expect(() => assertMediaResponse("text/html; charset=utf-8")).toThrow(/text\/html/);
    expect(() => assertMediaResponse("application/json")).toThrow(/application\/json/);
    expect(() => assertMediaResponse(null)).toThrow(/unknown type/);
  });
});

describe("redactUrl", () => {
  it("drops the token, which carries the signed Instagram URL", () => {
    expect(redactUrl(wrapped("1", "a"))).toBe("https://d.rapidcdn.app/v2");
  });
});

describe("reservePath", () => {
  let folder: string;
  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), "igmd-"));
  });
  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it("claims the plain name first, then numbered names, never overwriting", async () => {
    await writeFile(join(folder, "De_XnTMAStE-1.jpg"), "earlier download");

    const first = await reservePath(folder, "De_XnTMAStE-1", "jpg");
    await first.handle.close();

    expect(first.filePath).toBe(join(folder, "De_XnTMAStE-1 (1).jpg"));
    expect((await readdir(folder)).sort()).toEqual([
      "De_XnTMAStE-1 (1).jpg",
      "De_XnTMAStE-1 (1).jpg.part",
      "De_XnTMAStE-1.jpg",
    ]);
  });

  it("leaves nothing behind when a reservation is released", async () => {
    const reserved = await reservePath(folder, "De_XnTMAStE", "jpg");
    await reserved.handle.close();
    await releaseReservation(reserved.filePath, reserved.partPath);

    expect(await readdir(folder)).toEqual([]);
  });
});
