import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";

// vitest aliases "fs" and "node:fs" to the same mocked module graph, so a plain top-level
// `import ... from "node:fs"` in this file would also be intercepted by the vi.mock("fs") below.
// To load the real, checked-in binary fixtures we go through vi.importActual, which bypasses
// the mock and returns the genuine "fs" module.
let realReadFileSync: (path: string) => Buffer;

vi.mock("fs", () => {
  const readFileSync = vi.fn(() => Buffer.from("fake-file-bytes"));
  return {
    readFileSync,
  };
});

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { readFileSync } from "fs";
import { deleteUpload, uploadFile, uploadFromUrl } from "./cdnClient";
import { CdnApiError } from "./types";

const mockedReadFileSync = vi.mocked(readFileSync);

const FIXTURES_DIR = join(__dirname, "__fixtures__");

beforeAll(async () => {
  const actualFs = await vi.importActual<typeof import("fs")>("fs");
  realReadFileSync = actualFs.readFileSync as (path: string) => Buffer;
});

function loadFixture(filename: string): Buffer {
  return realReadFileSync(join(FIXTURES_DIR, filename));
}

/** Sets the mocked readFileSync return value, sidestepping a `@types/node` Buffer<ArrayBufferLike>
 *  vs. NonSharedBuffer overload-typing mismatch that has no bearing on runtime behavior. */
function setMockedFileBytes(buffer: Buffer): void {
  mockedReadFileSync.mockReturnValue(buffer as unknown as ReturnType<typeof mockedReadFileSync>);
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  mockedReadFileSync.mockReset();
  setMockedFileBytes(Buffer.from("fake-file-bytes"));
});

describe("uploadFile", () => {
  it("uploads the file and maps the response to an UploadRecord", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "photo.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/photo.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFile("/Users/gary/photo.png", "sk_cdn_test");

    expect(record).toEqual({
      id: "abc123",
      filename: "photo.png",
      url: "https://cdn.hackclub.com/abc123/photo.png",
      size: 2048,
      contentType: "image/png",
      createdAt: "2026-07-01T00:00:00.000Z",
      sourceType: "file",
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cdn.hackclub.com/api/v4/upload");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer sk_cdn_test");
  });

  it("builds the multipart body manually as a Buffer with an explicit boundary header", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "photo.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/photo.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    await uploadFile("/Users/gary/photo.png", "sk_cdn_test");

    const [, options] = fetchMock.mock.calls[0];

    const contentType = options.headers["Content-Type"];
    expect(contentType).toMatch(/^multipart\/form-data; boundary=.+/);
    const boundary = contentType.split("boundary=")[1];

    expect(Buffer.isBuffer(options.body)).toBe(true);
    const bodyString = (options.body as Buffer).toString("latin1");

    expect(bodyString).toContain(`Content-Disposition: form-data; name="file"; filename="photo.png"`);
    expect(bodyString).toContain("fake-file-bytes");

    const expectedTrailer = `\r\n--${boundary}--\r\n`;
    expect(bodyString.endsWith(expectedTrailer)).toBe(true);
  });

  it("escapes double quotes in the filename within the Content-Disposition header", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: `caption "quoted".png`,
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/caption.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    await uploadFile(`/Users/gary/caption "quoted".png`, "sk_cdn_test");

    const [, options] = fetchMock.mock.calls[0];
    const bodyString = (options.body as Buffer).toString("latin1");

    expect(bodyString).toContain(
      `Content-Disposition: form-data; name="file"; filename="caption \\"quoted\\".png"; ` +
        `filename*=UTF-8''caption%20%22quoted%22.png\r\n`,
    );
    // The raw, unescaped quote form must not appear anywhere in the body.
    expect(bodyString).not.toContain(`filename="caption "quoted".png"`);
  });

  it("strips CR/LF characters from the filename so they can't inject extra multipart headers", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "injected.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/injected.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const maliciousFilename = 'evil.png"\r\nX-Injected-Header: pwned\r\nContent-Disposition: form-data; name="file';

    await uploadFile(`/Users/gary/${maliciousFilename}`, "sk_cdn_test");

    const [, options] = fetchMock.mock.calls[0];
    const bodyString = (options.body as Buffer).toString("latin1");

    // The escaped filename should appear as a single, unbroken header line. In the ASCII-safe
    // fallback parameter, the CR/LF characters are first replaced with "_" by toAsciiSafeFallback
    // (they fall outside its \x20-\x7E printable-ASCII allowlist) before escapeMultipartFilename
    // escapes the remaining quotes/backslashes - so no raw \r or \n ever reaches the header.
    expect(bodyString).toContain(
      `Content-Disposition: form-data; name="file"; filename="evil.png\\"__X-Injected-Header: pwned` +
        `__Content-Disposition: form-data; name=\\"file"; filename*=UTF-8''evil.png%22%0D%0A` +
        `X-Injected-Header%3A%20pwned%0D%0AContent-Disposition%3A%20form-data%3B%20name%3D%22file\r\n`,
    );
    expect(bodyString).not.toContain("X-Injected-Header: pwned\r\n");

    // Every CR must be immediately followed by LF (i.e. only legitimate \r\n line terminators exist;
    // no raw, unpaired \r or \n was injected into the body).
    for (let i = 0; i < bodyString.length; i++) {
      if (bodyString[i] === "\r") {
        expect(bodyString[i + 1]).toBe("\n");
      }
      if (bodyString[i] === "\n") {
        expect(bodyString[i - 1]).toBe("\r");
      }
    }
  });

  it("adds an RFC 5987 filename* parameter and an ASCII-safe fallback for accented filenames", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "résumé.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/resume.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    await uploadFile("/Users/gary/résumé.png", "sk_cdn_test");

    const [, options] = fetchMock.mock.calls[0];
    const bodyString = (options.body as Buffer).toString("latin1");

    // encodeURIComponent("résumé.png") percent-encodes each UTF-8 byte of "é" (0xC3 0xA9) as
    // %C3%A9, so "résumé.png" (two accented "é"s) becomes "r%C3%A9sum%C3%A9.png".
    expect(bodyString).toContain(`filename*=UTF-8''r%C3%A9sum%C3%A9.png`);
    // The basic filename parameter is an ASCII-safe fallback: non-ASCII characters become "_".
    expect(bodyString).toContain(`filename="r_sum_.png"`);
  });

  it("adds an RFC 5987 filename* parameter and an ASCII-safe fallback for emoji filenames", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "abc123",
        filename: "✅.png",
        size: 2048,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/abc123/check.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    await uploadFile("/Users/gary/✅.png", "sk_cdn_test");

    const [, options] = fetchMock.mock.calls[0];
    const bodyString = (options.body as Buffer).toString("latin1");

    // encodeURIComponent("✅.png") percent-encodes the UTF-8 bytes of "✅" (0xE2 0x9C 0x85) as
    // %E2%9C%85, so "✅.png" becomes "%E2%9C%85.png".
    expect(bodyString).toContain(`filename*=UTF-8''%E2%9C%85.png`);
    expect(bodyString).toContain(`filename="_.png"`);
  });

  it("throws a specific error on 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: "invalid_auth" }));
    await expect(uploadFile("/x/y.png", "bad-token")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<CdnApiError>);
  });

  it("surfaces quota details on 402", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(402, {
        error: "Storage quota exceeded",
        quota: { storage_used: 52428800, storage_limit: 52428800, quota_tier: "unverified", percentage_used: 100 },
      }),
    );
    await expect(uploadFile("/x/y.png", "token")).rejects.toThrow(/unverified/);
  });

  it("includes width/height on the UploadRecord when the file bytes are a recognized image", async () => {
    setMockedFileBytes(loadFixture("sample-300x300.png"));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "img1",
        filename: "square.png",
        size: 1593,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/img1/square.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFile("/Users/gary/square.png", "sk_cdn_test");

    expect(record.width).toBe(300);
    expect(record.height).toBe(300);
  });

  it("includes distinct width/height for a non-square image", async () => {
    setMockedFileBytes(loadFixture("sample-800x200.jpg"));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "img2",
        filename: "wide.jpg",
        size: 4640,
        content_type: "image/jpeg",
        url: "https://cdn.hackclub.com/img2/wide.jpg",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFile("/Users/gary/wide.jpg", "sk_cdn_test");

    expect(record.width).toBe(800);
    expect(record.height).toBe(200);
  });

  it("leaves width/height undefined when the file bytes are not a recognized image", async () => {
    setMockedFileBytes(Buffer.from("not an image, just some bytes"));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "doc1",
        filename: "notes.txt",
        size: 30,
        content_type: "text/plain",
        url: "https://cdn.hackclub.com/doc1/notes.txt",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFile("/Users/gary/notes.txt", "sk_cdn_test");

    expect(record.width).toBeUndefined();
    expect(record.height).toBeUndefined();
  });
});

describe("uploadFromUrl", () => {
  it("sends a JSON body and maps the response with sourceType url", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "def456",
        filename: "document.pdf",
        size: 4096,
        content_type: "application/pdf",
        url: "https://cdn.hackclub.com/def456/document.pdf",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFromUrl("https://example.com/document.pdf", "sk_cdn_test");

    expect(record.sourceType).toBe("url");
    expect(record.width).toBeUndefined();
    expect(record.height).toBeUndefined();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cdn.hackclub.com/api/v4/upload_from_url");
    expect(JSON.parse(options.body)).toEqual({ url: "https://example.com/document.pdf" });
  });

  it("leaves width/height undefined for image content types too, since no dimension capture happens here", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: "def456",
        filename: "image.png",
        size: 1824,
        content_type: "image/png",
        url: "https://cdn.hackclub.com/def456/image.png",
        created_at: "2026-07-01T00:00:00.000Z",
      }),
    );

    const record = await uploadFromUrl("https://example.com/image.png", "sk_cdn_test");

    expect(record.sourceType).toBe("url");
    expect(record.width).toBeUndefined();
    expect(record.height).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("deleteUpload", () => {
  it("resolves without throwing on a successful delete", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: "abc123", deleted: true }));
    await expect(deleteUpload("abc123", "sk_cdn_test")).resolves.toBeUndefined();
  });

  it("treats a 404 as success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
    await expect(deleteUpload("gone", "sk_cdn_test")).resolves.toBeUndefined();
  });

  it("throws on other errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: "boom", error_id: "abc" }));
    await expect(deleteUpload("id", "sk_cdn_test")).rejects.toMatchObject({ status: 500 });
  });
});
