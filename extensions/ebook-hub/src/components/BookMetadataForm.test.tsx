// @vitest-environment happy-dom
import { rm } from "node:fs/promises";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { toasts } from "../test/raycast-api";
import { renderCommand, sampleBook, useTempLibrary, view } from "../test/render";
import { BookMetadataForm } from "./BookMetadataForm";

async function renderForm() {
  const store = await useTempLibrary();
  const book = await store.create(sampleBook());
  const onSaved = vi.fn();
  renderCommand(<BookMetadataForm book={book} onSaved={onSaved} />);
  return { store, book, onSaved };
}

const field = (name: string) => view().getByRole("textbox", { name });
const select = (name: string) => view().getByRole("combobox", { name });
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const save = () => fireEvent.click(view().getByRole("button", { name: "Save Changes" }));

describe("BookMetadataForm", () => {
  it("saves metadata changes", async () => {
    const { onSaved } = await renderForm();
    expect(view().getByRole("form", { name: "Edit “Walden”" })).toBeTruthy();

    change(field("Title"), "Walden II");
    change(select("Language"), "vi");
    change(field("Categories"), "Essays, Nature");
    save();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Walden II", language: "vi", categories: ["essays", "nature"] }),
      ),
    );
    expect(toasts).toContainEqual(expect.objectContaining({ style: "success", title: "Book updated" }));
  });

  it("requires a title and a license for shared books", async () => {
    const { onSaved } = await renderForm();

    change(field("Title"), "");
    save();
    await waitFor(() => expect(view().getByRole("alert").textContent).toBe("The item is required"));

    change(field("Title"), "Walden");
    change(select("Visibility"), "shared");
    change(field("License"), "");
    save();
    await waitFor(() => expect(view().getByRole("alert").textContent).toBe("Required for shared books"));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("reports save failures", async () => {
    const { store, book, onSaved } = await renderForm();
    await rm(store.bookPath(book.id), { recursive: true, force: true });

    save();

    await waitFor(() =>
      expect(toasts).toContainEqual(expect.objectContaining({ style: "failure", title: "Could not update book" })),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
