// @vitest-environment happy-dom
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fireEvent, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PROGRESS_SCHEMA_VERSION } from "./domain/book";
import Command from "./library";
import { readLastOpened, rememberLastOpened } from "./storage";
import { confirmAlert, environment, launchCommand, popView, toasts } from "./test/raycast-api";
import { renderCommand, sampleBook, useTempLibrary, view, viewDepth } from "./test/render";

async function seed() {
  const store = await useTempLibrary();
  const walden = await store.create(sampleBook());
  const kieu = await store.create(
    sampleBook({
      title: "Truyện Kiều",
      authors: ["Nguyễn Du"],
      language: "vi",
      categories: ["classic-poetry"],
      visibility: "shared",
      chapters: [{ title: "Hồi 1", markdown: "Trăm năm trong cõi người ta" }],
    }),
  );
  await store.writeProgress(kieu.id, {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    position: { chapterIndex: 0, blockIndex: 0 },
    percent: 42,
    bookmarks: [],
    updatedAt: "2999-01-01T00:00:00.000Z",
  });
  return { store, walden, kieu };
}

const bookNames = () =>
  within(view().getByRole("region", { name: "Books" }))
    .queryAllByRole("listitem")
    .map((item) => item.getAttribute("aria-label"));
const item = (name: string) => view().getByRole("listitem", { name });
const clickIn = (itemName: string, button: string) =>
  fireEvent.click(within(item(itemName)).getByRole("button", { name: button }));

describe("My Library", () => {
  it("lists books by recent activity with progress, language, and privacy", async () => {
    const { store, walden } = await seed();
    renderCommand(<Command />);

    await waitFor(() => expect(bookNames()).toEqual(["Truyện Kiều", "Walden"]));
    expect(within(item("Truyện Kiều")).getByText("42%")).toBeTruthy();
    expect(within(item("Truyện Kiều")).getByText("Vietnamese")).toBeTruthy();
    expect(within(item("Truyện Kiều")).getByRole("button", { name: "Continue Reading" })).toBeTruthy();
    expect(within(item("Walden")).getByText("1 min")).toBeTruthy();
    expect(item("Walden").querySelector('[data-tooltip="Private"]')).not.toBeNull();
    expect(item("Truyện Kiều").querySelector('[data-tooltip="Private"]')).toBeNull();
    expect(within(item("Walden")).getByRole("button", { name: "Show in Finder" }).getAttribute("data-path")).toBe(
      store.bookPath(walden.id),
    );
  });

  it("filters by search text, language, category, and visibility", async () => {
    await seed();
    renderCommand(<Command />);
    await waitFor(() => expect(bookNames()).toHaveLength(2));
    const search = view().getByRole("searchbox");
    const dropdown = view().getByRole("combobox", { name: "Filter Books" });

    fireEvent.change(search, { target: { value: "nguyen du" } });
    expect(bookNames()).toEqual(["Truyện Kiều"]);
    fireEvent.change(search, { target: { value: "" } });

    expect(within(dropdown).getByRole("option", { name: "Classic-Poetry" })).toBeTruthy();
    fireEvent.change(dropdown, { target: { value: "language:en" } });
    expect(bookNames()).toEqual(["Walden"]);
    fireEvent.change(dropdown, { target: { value: "category:classic-poetry" } });
    expect(bookNames()).toEqual(["Truyện Kiều"]);
    fireEvent.change(dropdown, { target: { value: "visibility:private" } });
    expect(bookNames()).toEqual(["Walden"]);

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(bookNames()).toEqual([]);
    expect(view().getByText("No matching books")).toBeTruthy();
    expect(view().getByText("2 books are hidden by the search or filter.")).toBeTruthy();

    fireEvent.click(within(view().getByTestId("empty-view")).getByRole("button", { name: "Clear Filters" }));

    expect(bookNames()).toEqual(["Truyện Kiều", "Walden"]);
    expect(search).toHaveProperty("value", "");
    expect(dropdown).toHaveProperty("value", "all");
  });

  it("counts a single hidden book in the empty state", async () => {
    const store = await useTempLibrary();
    await store.create(sampleBook());
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    fireEvent.change(view().getByRole("searchbox"), { target: { value: "zzz" } });

    expect(view().getByText("1 book is hidden by the search or filter.")).toBeTruthy();
  });

  it("shows the empty state with a community shortcut", async () => {
    await useTempLibrary();
    renderCommand(<Command />);

    await waitFor(() => expect(view().getByText("Your library is empty")).toBeTruthy());
    fireEvent.click(within(view().getByTestId("empty-view")).getByRole("button", { name: "Browse Community Library" }));

    expect(launchCommand).toHaveBeenCalledWith({ name: "browse-community", type: "userInitiated" });
  });

  it("reports a failure to open the Community Library", async () => {
    await useTempLibrary();
    launchCommand.mockRejectedValueOnce(new Error("Command is disabled"));
    renderCommand(<Command />);

    await waitFor(() => expect(view().getByText("Your library is empty")).toBeTruthy());
    fireEvent.click(within(view().getByTestId("empty-view")).getByRole("button", { name: "Browse Community Library" }));

    await waitFor(() =>
      expect(toasts.at(-1)).toMatchObject({
        title: "Could not open the Community Library",
        message: "Command is disabled",
      }),
    );
  });

  it("opens the reader and refreshes progress on return", async () => {
    const { store, walden } = await seed();
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    clickIn("Walden", "Start Reading");
    expect(viewDepth()).toBe(2);
    await waitFor(() => expect(view().getByTestId("markdown").textContent).toContain("When I wrote"));
    await waitFor(async () => expect(await store.readProgress(walden.id)).not.toBeNull());

    popView();
    await waitFor(() => expect(within(item("Walden")).getByRole("button", { name: "Continue Reading" })).toBeTruthy());
  });

  it("edits book metadata", async () => {
    await seed();
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    clickIn("Walden", "Edit Metadata");
    fireEvent.change(view().getByRole("textbox", { name: "Title" }), {
      target: { value: "Walden; or, Life in the Woods" },
    });
    fireEvent.click(view().getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(bookNames()).toContain("Walden; or, Life in the Woods"));
    expect(viewDepth()).toBe(1);
    expect(toasts).toContainEqual(expect.objectContaining({ title: "Book updated" }));
  });

  it("deletes a book after confirmation and forgets it as the last opened book", async () => {
    const { store, walden, kieu } = await seed();
    await rememberLastOpened(walden.id);
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    clickIn("Walden", "Delete Book");
    await waitFor(() => expect(bookNames()).toEqual(["Truyện Kiều"]));
    expect(confirmAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Delete “Walden”?" }));
    expect(await readLastOpened()).toBeNull();
    expect(toasts).toContainEqual(expect.objectContaining({ style: "success", title: "Book deleted" }));

    confirmAlert.mockResolvedValueOnce(false);
    clickIn("Truyện Kiều", "Delete Book");
    await waitFor(() => expect(confirmAlert).toHaveBeenCalledTimes(2));
    await expect(store.get(kieu.id)).resolves.toMatchObject({ title: "Truyện Kiều" });
  });

  it("reports delete failures", async () => {
    const { store, walden } = await seed();
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    await rm(store.bookPath(walden.id), { recursive: true, force: true });
    clickIn("Walden", "Delete Book");

    await waitFor(() =>
      expect(toasts).toContainEqual(expect.objectContaining({ style: "failure", title: "Could not delete book" })),
    );
  });

  it("imports a book and returns to the refreshed list", async () => {
    await seed();
    const file = join(environment.supportPath, "notes.md");
    await writeFile(file, "# Notes\n\nA short note.", "utf8");
    renderCommand(<Command />);
    await waitFor(() => expect(item("Walden")).toBeTruthy());

    clickIn("Walden", "Import Book");
    fireEvent.change(view().getByRole("textbox", { name: "File" }), { target: { value: file } });
    fireEvent.click(view().getByRole("button", { name: "Import Book" }));

    await waitFor(() => expect(bookNames()).toContain("Notes"));
    expect(viewDepth()).toBe(1);
  });

  it("refreshes, tolerates unreadable progress, and deletes unreadable books", async () => {
    const { store, walden } = await seed();
    const brokenId = randomUUID();
    await mkdir(store.bookPath(brokenId));
    await writeFile(join(store.bookPath(brokenId), "manifest.json"), "{", "utf8");
    await writeFile(join(store.bookPath(walden.id), "progress.json"), "{", "utf8");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    renderCommand(<Command />);

    await waitFor(() => expect(item(brokenId)).toBeTruthy());
    expect(consoleError).toHaveBeenCalled();
    expect(within(item("Walden")).getByText("1 min")).toBeTruthy();

    await store.create(sampleBook({ title: "Leaves of Grass" }));
    clickIn("Walden", "Refresh");
    await waitFor(() => expect(bookNames()).toContain("Leaves of Grass"));

    clickIn(brokenId, "Delete Book");
    await waitFor(() => expect(view().queryByRole("listitem", { name: brokenId })).toBeNull());
  });
});
