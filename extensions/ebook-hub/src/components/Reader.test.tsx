// @vitest-environment happy-dom
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PROGRESS_SCHEMA_VERSION, type BookManifest } from "../domain/book";
import { readLastOpened } from "../storage";
import type { LibraryStore } from "../storage/library-store";
import { preferences, toasts } from "../test/raycast-api";
import { renderCommand, sampleBook, useTempLibrary, view, viewDepth } from "../test/render";
import { Reader } from "./Reader";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");
const paragraph = (label: string) => `${label} ${words(59)}`;

async function setup(): Promise<{ store: LibraryStore; book: BookManifest }> {
  preferences.wordsPerPage = "100";
  const store = await useTempLibrary();
  const book = await store.create(
    sampleBook({
      chapters: [
        { title: "Economy", markdown: [paragraph("Alpha"), paragraph("Bravo"), paragraph("Charlie")].join("\n\n") },
        { title: "Solitude", markdown: "Delta ends here." },
      ],
    }),
  );
  return { store, book };
}

const markdown = () => view().getByTestId("markdown").textContent ?? "";
const heading = () => view().getByRole("heading").textContent;
const click = (name: string) => fireEvent.click(view().getByRole("button", { name }));
const lastToast = () => toasts[toasts.length - 1];

async function expectPage(label: string) {
  await waitFor(() => expect(markdown().startsWith(label)).toBe(true));
}

describe("Reader", () => {
  it("turns pages across chapters, reports boundaries, and saves progress", async () => {
    const { store, book } = await setup();
    renderCommand(<Reader bookId={book.id} />);

    await expectPage("Alpha");
    expect(heading()).toBe("Walden · Economy · 1/3 · 33%");
    expect(await readLastOpened()).toBe(book.id);

    click("Next Page");
    await expectPage("Bravo");
    click("Next Page");
    await expectPage("Charlie");
    click("Next Page");
    await expectPage("Delta");
    expect(heading()).toBe("Walden · Solitude · 1/1 · 100%");

    click("Next Page");
    expect(lastToast()).toMatchObject({ style: "success", title: "You reached the end of the book" });
    click("Next Chapter");
    expect(lastToast()).toMatchObject({ style: "failure", title: "No next chapter" });
    await waitFor(async () =>
      expect((await store.readProgress(book.id))?.position).toEqual({ chapterIndex: 1, blockIndex: 0 }),
    );

    click("Previous Page");
    await expectPage("Charlie");
    expect(heading()).toBe("Walden · Economy · 3/3 · 98%");
    click("Previous Chapter");
    expect(lastToast()).toMatchObject({ style: "failure", title: "No previous chapter" });
    click("Next Chapter");
    await expectPage("Delta");
    click("Previous Chapter");
    await expectPage("Alpha");
    click("Previous Page");
    expect(lastToast()).toMatchObject({ style: "failure", title: "Already at the beginning" });
  });

  it("jumps several pages and walks the jumplist back", async () => {
    const { book } = await setup();
    renderCommand(<Reader bookId={book.id} />);
    await expectPage("Alpha");

    click("Forward 5 Pages");
    await expectPage("Charlie");
    click("Forward 5 Pages");
    await expectPage("Delta");
    click("Previous Page");
    await expectPage("Charlie");
    click("Back 5 Pages");
    await expectPage("Alpha");
    click("Back 5 Pages");
    expect(lastToast()).toMatchObject({ title: "Already at the beginning" });

    click("Jump Back");
    await expectPage("Charlie");
    click("Jump Back");
    await expectPage("Alpha");
    click("Jump Back");
    expect(lastToast()).toMatchObject({ style: "failure", title: "No earlier position" });
  });

  it("resumes saved progress and hides progress in focus mode", async () => {
    const { store, book } = await setup();
    preferences.focusMode = true;
    await store.writeProgress(book.id, {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      position: { chapterIndex: 0, blockIndex: 2 },
      percent: 98,
      bookmarks: [],
      updatedAt: "2026-09-15T00:00:00.000Z",
    });

    renderCommand(<Reader bookId={book.id} />);

    await expectPage("Charlie");
    expect(heading()).toBe("Walden");
  });

  it("starts over when saved progress is invalid", async () => {
    const { store, book } = await setup();
    await writeFile(join(store.bookPath(book.id), "progress.json"), '{"schemaVersion":9}', "utf8");

    renderCommand(<Reader bookId={book.id} />);

    await expectPage("Alpha");
    expect(toasts).toContainEqual(expect.objectContaining({ style: "failure", title: "Starting from the beginning" }));
  });

  it("shows an error when the book is missing or its progress is unreadable", async () => {
    const { store, book } = await setup();
    renderCommand(<Reader bookId={randomUUID()} />);
    await waitFor(() => expect(markdown()).toContain("Could not open book"));

    await mkdir(join(store.bookPath(book.id), "progress.json"));
    renderCommand(<Reader bookId={book.id} />);
    await waitFor(() => expect(markdown()).toContain("Could not read the progress"));
  });

  it("shows chapter load errors and empty chapters", async () => {
    const { store, book } = await setup();
    await rm(join(store.bookPath(book.id), "chapters", "0002.md"));
    await writeFile(join(store.bookPath(book.id), "chapters", "0001.md"), "", "utf8");

    renderCommand(<Reader bookId={book.id} />);

    await waitFor(() => expect(markdown()).toBe("_This chapter is empty._"));
    expect(heading()).toBe("Walden · Economy · 1/1 · 0%");
    click("Next Chapter");
    await waitFor(() => expect(markdown()).toContain("Could not load chapter"));
    expect(heading()).toBe("Walden");
  });

  it("adds and removes bookmarks and reports save failures", async () => {
    const { store, book } = await setup();
    renderCommand(<Reader bookId={book.id} />);
    await expectPage("Alpha");

    click("Add Bookmark");
    expect(lastToast()).toMatchObject({ title: "Bookmark added" });
    await waitFor(async () => expect((await store.readProgress(book.id))?.bookmarks).toHaveLength(1));
    expect((await store.readProgress(book.id))?.bookmarks[0]).toMatchObject({
      chapterIndex: 0,
      blockIndex: 0,
      excerpt: expect.stringMatching(/^Alpha word/),
    });

    click("Remove Bookmark");
    expect(lastToast()).toMatchObject({ title: "Bookmark removed" });
    expect(view().getByRole("button", { name: "Add Bookmark" })).toBeTruthy();

    await rm(store.bookPath(book.id), { recursive: true, force: true });
    click("Add Bookmark");
    await waitFor(() =>
      expect(toasts).toContainEqual(expect.objectContaining({ title: "Could not save reading progress" })),
    );
  });

  it("jumps from Command Mode and applies bookmark deletions made there", async () => {
    const { book } = await setup();
    renderCommand(<Reader bookId={book.id} />);
    await expectPage("Alpha");

    click("Next Page");
    await expectPage("Bravo");
    click("Add Bookmark");
    click("Next Page");
    await expectPage("Charlie");
    click("Add Bookmark");

    click("Command Mode");
    expect(viewDepth()).toBe(2);
    fireEvent.change(view().getByRole("searchbox"), { target: { value: ":bm" } });
    expect(view().getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(within(view().getAllByRole("listitem")[0]).getByRole("button", { name: "Delete Bookmark" }));
    fireEvent.click(within(view().getAllByRole("listitem")[0]).getByRole("button", { name: "Delete Bookmark" }));
    expect(view().queryAllByRole("listitem")).toHaveLength(0);

    fireEvent.change(view().getByRole("searchbox"), { target: { value: ":c2" } });
    click("Go to Chapter");
    await expectPage("Delta");
    expect(viewDepth()).toBe(1);

    click("Jump Back");
    await expectPage("Charlie");
    expect(view().getByRole("button", { name: "Add Bookmark" })).toBeTruthy();

    click("Search in Book");
    expect(view().getByRole("searchbox")).toHaveProperty("value", "/");
  });
});
