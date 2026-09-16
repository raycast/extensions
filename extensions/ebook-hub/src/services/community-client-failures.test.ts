import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { CommunityBookEntry } from "../domain/community";
import { assertHttpsUrl, downloadCommunityBook, fetchCommunityIndex, type Fetcher } from "./community-client";

const INDEX_URL = "https://cdn.example/lib/index.json";
const LIMIT_BYTES = 20 * 1024 * 1024;

const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");
const respond =
  (body: string): Fetcher =>
  () =>
    Promise.resolve(new Response(body));

function sizedResponse(bytes: number, headers: Record<string, string> = {}): Fetcher {
  return () =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers(headers),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(bytes)),
    } as unknown as Response);
}

const entry = (files: CommunityBookEntry["files"]): CommunityBookEntry => ({
  slug: "walden",
  version: "1.0.0",
  title: "Walden",
  authors: [],
  language: "en",
  categories: [],
  license: "public-domain",
  summary: "",
  path: "books/en/walden",
  files,
});

describe("community client failures", () => {
  it("rejects malformed URLs", () => {
    expect(() => assertHttpsUrl("not a url")).toThrow(/is not a valid URL/);
  });

  it("reports unreachable hosts", async () => {
    await expect(fetchCommunityIndex(INDEX_URL, () => Promise.reject(new TypeError("offline")))).rejects.toThrow(
      "Could not reach cdn.example.",
    );
  });

  it("enforces the download size limit from headers and bodies", async () => {
    await expect(
      fetchCommunityIndex(INDEX_URL, sizedResponse(10, { "content-length": String(LIMIT_BYTES + 1) })),
    ).rejects.toThrow(/larger than the 20 MB limit/);
    await expect(fetchCommunityIndex(INDEX_URL, sizedResponse(LIMIT_BYTES + 1))).rejects.toThrow(
      /larger than the 20 MB limit/,
    );
  });

  it("reports index schema errors", async () => {
    await expect(fetchCommunityIndex(INDEX_URL, respond(JSON.stringify({ schemaVersion: 2 })))).rejects.toThrow(
      /The community index is invalid: index.schemaVersion 2/,
    );
  });

  it("requires book.json in the downloaded files", async () => {
    await expect(
      downloadCommunityBook(entry([{ path: "chapters/0001.md", sha256: sha256("x") }]), INDEX_URL, respond("x")),
    ).rejects.toThrow("walden has no book.json.");
  });

  it("rejects invalid book files and chapters missing from the index", async () => {
    await expect(
      downloadCommunityBook(entry([{ path: "book.json", sha256: sha256("{") }]), INDEX_URL, respond("{")),
    ).rejects.toThrow("walden/book.json is not valid JSON.");

    await expect(
      downloadCommunityBook(entry([{ path: "book.json", sha256: sha256("{}") }]), INDEX_URL, respond("{}")),
    ).rejects.toThrow(/walden\/book.json is invalid/);

    const bookJson = JSON.stringify({
      title: "Walden",
      authors: [],
      language: "en",
      categories: [],
      license: "public-domain",
      source: "https://example.org",
      chapters: [{ title: "Two", file: "chapters/0002.md" }],
    });
    await expect(
      downloadCommunityBook(entry([{ path: "book.json", sha256: sha256(bookJson) }]), INDEX_URL, respond(bookJson)),
    ).rejects.toThrow("Chapter file chapters/0002.md is not listed in the community index.");
  });
});
