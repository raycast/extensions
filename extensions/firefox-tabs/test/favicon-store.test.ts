import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { MAX_AGE_MS, createFaviconStore, decodeDataUri } from "../src/lib/favicon-store.ts";

const PNG_URI = "data:image/png;base64,iVBORw0KGgo=";
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("decodeDataUri", () => {
  test("decodes base64 payloads", () => {
    const decoded = decodeDataUri(PNG_URI);
    assert.equal(decoded?.mime, "image/png");
    assert.deepEqual(decoded?.bytes, PNG_BYTES);
  });

  test("ignores parameters other than base64", () => {
    const decoded = decodeDataUri("data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+");
    assert.equal(decoded?.mime, "image/svg+xml");
    assert.equal(decoded?.bytes.toString(), "<svg/>");
  });

  test("decodes percent-escapes and keeps literal UTF-8", () => {
    const decoded = decodeDataUri("data:image/svg+xml;utf8,%3Csvg%3Eé</svg>");
    assert.equal(decoded?.bytes.toString(), "<svg>é</svg>");
  });

  test("tolerates a stray % and non-UTF-8 escapes", () => {
    const decoded = decodeDataUri('data:image/svg+xml,<svg width="100%">%89</svg>');
    assert.deepEqual(
      decoded?.bytes,
      Buffer.concat([Buffer.from('<svg width="100%">'), Buffer.from([0x89]), Buffer.from("</svg>")])
    );
  });

  test("normalizes the mime type", () => {
    assert.equal(decodeDataUri("data: IMAGE/PNG ;base64,AAEC")?.mime, "image/png");
    assert.equal(decodeDataUri("data:;base64,AAEC")?.mime, "");
  });

  test("rejects non-data URIs and empty payloads", () => {
    assert.equal(decodeDataUri("https://example.com/favicon.ico"), null);
    assert.equal(decodeDataUri("data:image/png;base64"), null);
    assert.equal(decodeDataUri("data:image/png;base64,"), null);
  });
});

describe("createFaviconStore", () => {
  let root: string;
  let cacheDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "favicon-store-"));
    cacheDir = join(root, "favicons");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("writes the decoded bytes to a file named by hash and mime type", () => {
    const path = createFaviconStore(cacheDir)(PNG_URI);
    assert.ok(path);
    assert.match(basename(path), /^[0-9a-f]{40}\.png$/);
    assert.deepEqual(readFileSync(path), PNG_BYTES);
    assert.deepEqual(readdirSync(cacheDir), [basename(path)]);
  });

  test("picks the file extension from the mime type", () => {
    const store = createFaviconStore(cacheDir);
    assert.match(store("data:image/svg+xml;base64,PHN2Zy8+") ?? "", /\.svg$/);
    assert.match(store("data:image/x-icon;base64,AAEC") ?? "", /\.ico$/);
    assert.match(store("data:application/octet-stream;base64,AAEC") ?? "", /\.png$/);
  });

  test("returns the same path for repeated calls and identical icons", () => {
    const first = createFaviconStore(cacheDir)(PNG_URI);
    const store = createFaviconStore(cacheDir);
    assert.equal(store(PNG_URI), first);
    assert.equal(store(PNG_URI), first);
    assert.equal(readdirSync(cacheDir).length, 1);
  });

  test("returns null for URIs it can't decode", () => {
    assert.equal(createFaviconStore(cacheDir)("data:image/png;base64,"), null);
  });

  test("returns null when the cache dir can't be created", () => {
    const blocker = join(root, "blocker");
    writeFileSync(blocker, "");
    assert.equal(createFaviconStore(join(blocker, "favicons"))(PNG_URI), null);
  });

  test("prunes files unused for longer than MAX_AGE_MS on first use", () => {
    const store = createFaviconStore(cacheDir);
    store(PNG_URI);
    const stale = join(cacheDir, "stale.png");
    const fresh = join(cacheDir, "fresh.png");
    writeFileSync(stale, "");
    writeFileSync(fresh, "");
    const old = new Date(Date.now() - MAX_AGE_MS - 60_000);
    utimesSync(stale, old, old);

    createFaviconStore(cacheDir)("data:image/png;base64,AAEC");
    assert.equal(existsSync(stale), false);
    assert.equal(existsSync(fresh), true);
  });

  test("refreshes the mtime of icons it serves so they don't expire", () => {
    const path = createFaviconStore(cacheDir)(PNG_URI);
    assert.ok(path);
    const old = new Date(Date.now() - MAX_AGE_MS + 60_000);
    utimesSync(path, old, old);

    createFaviconStore(cacheDir)(PNG_URI);
    assert.ok(statSync(path).mtimeMs > old.getTime() + 30_000);
  });
});
