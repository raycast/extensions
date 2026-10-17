// @vitest-environment happy-dom
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Command from "./import-book";
import { environment, getSelectedFinderItems, toasts } from "./test/raycast-api";
import { renderCommand, useTempLibrary, view, viewDepth } from "./test/render";

const field = (name: string) => view().getByRole("textbox", { name });
const select = (name: string) => view().getByRole("combobox", { name });
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const submit = () => fireEvent.click(view().getByRole("button", { name: "Import Book" }));

async function writeSupportFile(name: string, content: string): Promise<string> {
  const path = join(environment.supportPath, name);
  await writeFile(path, content, "utf8");
  return path;
}

describe("Import Book", () => {
  it("validates the file and requires a license for shared books", async () => {
    await useTempLibrary();
    renderCommand(<Command />);

    submit();
    await waitFor(() => expect(view().getByRole("alert").textContent).toBe("Choose a file"));

    change(field("File"), "/books/novel.mobi");
    submit();
    await waitFor(() => expect(view().getByRole("alert").textContent).toMatch(/^Supported: \.md/));

    change(field("File"), "/books/novel.md");
    change(select("Visibility"), "shared");
    submit();
    await waitFor(() => expect(view().getByRole("alert").textContent).toBe("Required for shared books"));
  });

  it("imports with detected metadata and opens the reader", async () => {
    const store = await useTempLibrary();
    const file = await writeSupportFile(
      "truyen.md",
      "---\nlang: vi\nauthor: Nguyễn Du\n---\n# Chương 1\n\nMột.\n\n# Chương 2\n\nHai.",
    );
    renderCommand(<Command />);

    change(field("File"), file);
    submit();

    await waitFor(() => expect(viewDepth()).toBe(2));
    expect(toasts).toContainEqual({ style: "success", title: "Imported “truyen”", message: "2 chapters" });
    expect((await store.list()).books[0]).toMatchObject({
      title: "truyen",
      authors: ["Nguyễn Du"],
      language: "vi",
      visibility: "private",
      license: null,
    });
  });

  it("applies metadata overrides", async () => {
    const store = await useTempLibrary();
    const file = await writeSupportFile("plain.txt", "Hello world.");
    renderCommand(<Command />);

    change(field("File"), file);
    change(field("Title"), "Custom Title");
    change(field("Authors"), "A, B");
    change(select("Language"), "fr");
    change(field("Categories"), "Poetry, Classics");
    change(select("Visibility"), "shared");
    change(field("License"), "CC0-1.0");
    submit();

    await waitFor(() => expect(viewDepth()).toBe(2));
    expect((await store.list()).books[0]).toMatchObject({
      title: "Custom Title",
      authors: ["A", "B"],
      language: "fr",
      categories: ["poetry", "classics"],
      visibility: "shared",
      license: "CC0-1.0",
      source: { kind: "import", format: "txt", fileName: "plain.txt" },
    });
  });

  it("reports import failures", async () => {
    await useTempLibrary();
    const file = await writeSupportFile("broken.epub", "not a zip");
    renderCommand(<Command />);

    change(field("File"), file);
    submit();

    await waitFor(() =>
      expect(toasts).toContainEqual({
        style: "failure",
        title: "Import failed",
        message: "This file is not a valid EPUB archive.",
      }),
    );
    expect(viewDepth()).toBe(1);
  });

  it("prefills the first supported file selected in Finder", async () => {
    await useTempLibrary();
    getSelectedFinderItems.mockResolvedValueOnce([{ path: "/books/a.mobi" }, { path: "/books/b.pdf" }]);

    renderCommand(<Command />);

    await waitFor(() => expect(field("File")).toHaveProperty("value", "/books/b.pdf"));
  });

  it("leaves the file empty when Finder has no supported selection", async () => {
    await useTempLibrary();
    getSelectedFinderItems.mockResolvedValueOnce([{ path: "/books/a.mobi" }]);

    renderCommand(<Command />);

    await waitFor(() => expect(getSelectedFinderItems).toHaveBeenCalled());
    expect(field("File")).toHaveProperty("value", "");
  });
});
