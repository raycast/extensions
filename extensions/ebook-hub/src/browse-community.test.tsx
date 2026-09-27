// @vitest-environment happy-dom
import { createHash } from "node:crypto";

import { fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Command from "./browse-community";
import { openExtensionPreferences, preferences, toasts } from "./test/raycast-api";
import { renderCommand, useTempLibrary, view, viewDepth } from "./test/render";

const INDEX_URL = "https://cdn.example/lib/index.json";
const BOOK_BASE = "https://cdn.example/lib/books/en/walden/";
const chapter = "# Economy\n\nWhen I wrote the following pages.";
const bookJson = JSON.stringify({
  title: "Walden",
  authors: ["Henry David Thoreau"],
  language: "en",
  categories: ["essays"],
  license: "public-domain",
  source: "https://www.gutenberg.org/ebooks/205",
  chapters: [{ title: "Economy", file: "chapters/0001.md" }],
});

const sha256 = (content: string) => createHash("sha256").update(content).digest("hex");

function indexJson(): string {
  return JSON.stringify({
    schemaVersion: 1,
    generatedAt: "2026-09-15T00:00:00Z",
    repository: "https://github.com/crafts69guy/ebook-hub-library",
    ref: "main",
    books: [
      {
        slug: "walden",
        version: "1.0.0",
        title: "Walden",
        authors: ["Henry David Thoreau"],
        language: "en",
        categories: ["essays"],
        license: "public-domain",
        summary: "Life in the woods.",
        path: "books/en/walden",
        files: [
          { path: "book.json", sha256: sha256(bookJson) },
          { path: "chapters/0001.md", sha256: sha256(chapter) },
        ],
      },
      {
        slug: "kieu",
        version: "1.0.0",
        title: "Truyện Kiều",
        authors: ["Nguyễn Du"],
        language: "vi",
        categories: ["poetry"],
        license: "public-domain",
        path: "books/vi/kieu",
        files: [{ path: "book.json", sha256: "0".repeat(64) }],
      },
      { slug: "pirated", license: "all-rights-reserved" },
    ],
  });
}

let files: Record<string, string>;
const fetchMock = vi.fn((url: string) =>
  Promise.resolve(url in files ? new Response(files[url]) : new Response("missing", { status: 404 })),
);

beforeEach(() => {
  preferences.communityIndexUrl = INDEX_URL;
  files = { [INDEX_URL]: indexJson(), [`${BOOK_BASE}book.json`]: bookJson, [`${BOOK_BASE}chapters/0001.md`]: chapter };
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const names = () =>
  view()
    .queryAllByRole("listitem")
    .map((item) => item.getAttribute("aria-label"));
const item = (name: string) => view().getByRole("listitem", { name });

describe("Browse Community Library", () => {
  it("lists valid books, reports skipped entries, filters, and links to GitHub", async () => {
    await useTempLibrary();
    renderCommand(<Command />);

    await waitFor(() => expect(names()).toEqual(["Walden", "Truyện Kiều"]));
    expect(view().getByRole("region", { name: "Community Books" }).getAttribute("data-subtitle")).toBe(
      "2 · 1 invalid skipped",
    );
    expect(within(item("Walden")).getByText("public-domain")).toBeTruthy();
    expect(within(item("Walden")).getByText("English")).toBeTruthy();
    expect(within(item("Walden")).getByRole("button", { name: "Open on GitHub" }).getAttribute("data-url")).toBe(
      "https://github.com/crafts69guy/ebook-hub-library/tree/main/books/en/walden",
    );

    fireEvent.change(view().getByRole("searchbox"), { target: { value: "nguyen" } });
    expect(names()).toEqual(["Truyện Kiều"]);
    fireEvent.change(view().getByRole("searchbox"), { target: { value: "" } });
    fireEvent.change(view().getByRole("combobox", { name: "Filter Books" }), { target: { value: "category:essays" } });
    expect(names()).toEqual(["Walden"]);

    const calls = fetchMock.mock.calls.length;
    fireEvent.click(within(item("Walden")).getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
  });

  it("explains an empty result caused by the search or filter and clears it", async () => {
    await useTempLibrary();
    renderCommand(<Command />);
    await waitFor(() => expect(names()).toHaveLength(2));

    fireEvent.change(view().getByRole("searchbox"), { target: { value: "zzzz" } });

    expect(names()).toEqual([]);
    expect(view().getByText("No matching books")).toBeTruthy();
    expect(view().getByText("2 books are hidden by the search or filter.")).toBeTruthy();

    fireEvent.click(within(view().getByTestId("empty-view")).getByRole("button", { name: "Clear Filters" }));

    expect(names()).toEqual(["Walden", "Truyện Kiều"]);
    expect(view().getByRole("searchbox")).toHaveProperty("value", "");
  });

  it("adds a book to the library and opens it", async () => {
    const store = await useTempLibrary();
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    fireEvent.click(within(item("Walden")).getByRole("button", { name: "Add to Library" }));

    await waitFor(() => expect(within(item("Walden")).getByRole("button", { name: "Read" })).toBeTruthy());
    expect(toasts).toContainEqual({ style: "success", title: "Added “Walden” to your library" });
    expect((await store.list()).books[0]).toMatchObject({
      title: "Walden",
      visibility: "shared",
      source: { kind: "community", slug: "walden" },
    });

    fireEvent.click(within(item("Walden")).getByRole("button", { name: "Read" }));
    expect(viewDepth()).toBe(2);
    await waitFor(() => expect(view().getByTestId("markdown").textContent).toContain("When I wrote"));
  });

  it("reports failed downloads", async () => {
    await useTempLibrary();
    files[`${BOOK_BASE}chapters/0001.md`] = "tampered";
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    fireEvent.click(within(item("Walden")).getByRole("button", { name: "Add to Library" }));

    await waitFor(() =>
      expect(toasts).toContainEqual(
        expect.objectContaining({
          style: "failure",
          title: "Could not add book",
          message: expect.stringMatching(/Checksum mismatch/),
        }),
      ),
    );
  });

  it("shows an unavailable state that can retry or open preferences", async () => {
    await useTempLibrary();
    delete files[INDEX_URL];
    renderCommand(<Command />);

    await waitFor(() => expect(view().getByText("Community library unavailable")).toBeTruthy());
    expect(view().getByText(/failed with HTTP 404/)).toBeTruthy();

    fireEvent.click(view().getByRole("button", { name: "Open Extension Preferences" }));
    expect(openExtensionPreferences).toHaveBeenCalledTimes(1);

    files[INDEX_URL] = indexJson();
    fireEvent.click(view().getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(names()).toEqual(["Walden", "Truyện Kiều"]));
  });
});
