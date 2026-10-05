// @vitest-environment happy-dom
import { fireEvent, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Bookmark } from "../domain/book";
import { open } from "../test/raycast-api";
import { renderCommand, sampleBook, useTempLibrary, view } from "../test/render";
import { CommandMode } from "./CommandMode";

const pages = [
  { startBlock: 0, endBlock: 2, words: 10 },
  { startBlock: 2, endBlock: 4, words: 10 },
];

async function renderMode(overrides: Partial<ComponentProps<typeof CommandMode>> = {}) {
  const store = await useTempLibrary();
  const book = await store.create(sampleBook());
  const onJump = vi.fn();
  const onDeleteBookmark = vi.fn();
  renderCommand(
    <CommandMode
      book={book}
      position={{ chapterIndex: 0, blockIndex: 0 }}
      currentPages={pages}
      bookmarks={[]}
      initialText=""
      onJump={onJump}
      onDeleteBookmark={onDeleteBookmark}
      {...overrides}
    />,
  );
  return { onJump, onDeleteBookmark };
}

const type = (text: string) => fireEvent.change(view().getByRole("searchbox"), { target: { value: text } });
const itemNames = () =>
  view()
    .queryAllByRole("listitem")
    .map((item) => item.getAttribute("aria-label"));
const clickIn = (itemName: string, button: string) =>
  fireEvent.click(within(view().getByRole("listitem", { name: itemName })).getByRole("button", { name: button }));

describe("CommandMode", () => {
  it("lists and filters the table of contents", async () => {
    const { onJump } = await renderMode();

    expect(itemNames()).toEqual(["1. Economy", "2. Solitude"]);
    type("soli");
    expect(itemNames()).toEqual(["2. Solitude"]);
    clickIn("2. Solitude", "Go to Chapter");

    expect(onJump).toHaveBeenCalledWith({ chapterIndex: 1, blockIndex: 0 });
  });

  it("jumps to pages and chapters by number", async () => {
    const { onJump } = await renderMode();

    type(":2");
    clickIn("Go to Page 2", "Go to Page");
    expect(onJump).toHaveBeenLastCalledWith({ chapterIndex: 0, blockIndex: 2 });
    type(":9");
    expect(view().getByText("Page out of range")).toBeTruthy();

    type(":c2");
    clickIn("Go to 2. Solitude", "Go to Chapter");
    expect(onJump).toHaveBeenLastCalledWith({ chapterIndex: 1, blockIndex: 0 });
    type(":c7");
    expect(view().getByText("Chapter out of range")).toBeTruthy();
  });

  it("goes to and deletes bookmarks", async () => {
    const bookmarks: Bookmark[] = [
      { chapterIndex: 0, blockIndex: 2, excerpt: "Saved line", createdAt: "2026-09-15T00:00:00.000Z" },
      { chapterIndex: 9, blockIndex: 0, excerpt: "", createdAt: "2026-09-15T00:00:00.000Z" },
    ];
    const { onJump, onDeleteBookmark } = await renderMode({ bookmarks, initialText: ":bm" });

    expect(itemNames()).toEqual(["Saved line", "Bookmark"]);
    expect(within(view().getByRole("listitem", { name: "Bookmark" })).getByText("10. Unknown chapter")).toBeTruthy();

    clickIn("Saved line", "Go to Bookmark");
    expect(onJump).toHaveBeenCalledWith({ chapterIndex: 0, blockIndex: 2 });
    clickIn("Bookmark", "Delete Bookmark");
    expect(onDeleteBookmark).toHaveBeenCalledWith(bookmarks[1]);
    expect(itemNames()).toEqual(["Saved line"]);
  });

  it("applies Hue themes", async () => {
    await renderMode({ initialText: ":theme" });

    expect(itemNames()).toEqual(["Apply Huế Mưa", "Apply Huế Hương", "Apply Huế Cung"]);
    type(":theme cu");
    clickIn("Apply Huế Cung", "Apply Theme");
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));

    type(":theme zzz");
    expect(view().getByText("Unknown theme")).toBeTruthy();
  });

  it("searches the whole book without diacritics", async () => {
    const { onJump } = await renderMode({ initialText: "/" });
    expect(view().getByText("Search this book")).toBeTruthy();

    type("/DELICIOUS");
    const hit = await view().findByRole("listitem", { name: "This is a delicious evening." });
    expect(within(hit).getByText("2. Solitude")).toBeTruthy();
    clickIn("This is a delicious evening.", "Go to Match");
    expect(onJump).toHaveBeenCalledWith({ chapterIndex: 1, blockIndex: 0 });

    type("/zzzz");
    expect(itemNames()).toEqual([]);
    expect(view().getByText("No matches")).toBeTruthy();
  });

  it("explains unknown commands", async () => {
    await renderMode({ initialText: ":wat" });
    expect(view().getByText("Unknown command")).toBeTruthy();
  });
});
