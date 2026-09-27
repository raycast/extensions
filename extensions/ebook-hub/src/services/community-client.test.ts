import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { CommunityBookEntry } from "../domain/community";
import { downloadCommunityBook, fetchCommunityIndex, type Fetcher } from "./community-client";

const INDEX_URL = "https://cdn.example/lib/index.json";
const chapter = "# Economy\n\nWhen I wrote the following pages.";
const bookJson = JSON.stringify({
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en-US",
  categories: ["essays"],
  license: "public-domain",
  source: "https://www.gutenberg.org/ebooks/205",
  chapters: [{ title: "Economy", file: "chapters/0001.md" }],
});

const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

const entry: CommunityBookEntry = {
  slug: "walden",
  version: "1.0.0",
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en",
  categories: ["essays"],
  license: "public-domain",
  summary: "",
  path: "books/en/walden",
  files: [
    { path: "book.json", sha256: sha256(bookJson) },
    { path: "chapters/0001.md", sha256: sha256(chapter) },
  ],
};

function fakeFetcher(files: Record<string, string>): Fetcher {
  return (url) => Promise.resolve(url in files ? new Response(files[url]) : new Response("not found", { status: 404 }));
}

const libraryFiles = {
  "https://cdn.example/lib/books/en/walden/book.json": bookJson,
  "https://cdn.example/lib/books/en/walden/chapters/0001.md": chapter,
};

describe("downloadCommunityBook", () => {
  it("downloads, verifies checksums, and builds a shared draft", async () => {
    const draft = await downloadCommunityBook(entry, INDEX_URL, fakeFetcher(libraryFiles));

    expect(draft).toMatchObject({
      title: "Walden",
      language: "en",
      license: "public-domain",
      visibility: "shared",
      source: { kind: "community", slug: "walden", version: "1.0.0", indexUrl: INDEX_URL },
    });
    expect(draft.chapters).toEqual([{ title: "Economy", markdown: chapter }]);
  });

  it("rejects tampered files", async () => {
    const tampered = { ...libraryFiles, "https://cdn.example/lib/books/en/walden/chapters/0001.md": "tampered" };
    await expect(downloadCommunityBook(entry, INDEX_URL, fakeFetcher(tampered))).rejects.toThrow(/Checksum mismatch/);
  });
});

describe("fetchCommunityIndex", () => {
  it("requires https", async () => {
    await expect(fetchCommunityIndex("http://cdn.example/index.json", fakeFetcher({}))).rejects.toThrow(/https/);
  });

  it("reports HTTP failures", async () => {
    await expect(fetchCommunityIndex(INDEX_URL, fakeFetcher({}))).rejects.toThrow(/HTTP 404/);
  });

  it("reports invalid JSON", async () => {
    await expect(fetchCommunityIndex(INDEX_URL, fakeFetcher({ [INDEX_URL]: "{" }))).rejects.toThrow(/not valid JSON/);
  });
});
