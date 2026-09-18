// @vitest-environment happy-dom
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Command from "./continue-reading";
import { rememberLastOpened } from "./storage";
import { launchCommand, toasts } from "./test/raycast-api";
import { renderCommand, sampleBook, useTempLibrary, view } from "./test/render";

const markdown = () => view().getByTestId("markdown").textContent ?? "";

describe("Continue Reading", () => {
  it("offers the library when no book was opened yet", async () => {
    await useTempLibrary();
    renderCommand(<Command />);

    await waitFor(() => expect(markdown()).toContain("Nothing to continue"));
    fireEvent.click(view().getByRole("button", { name: "Open My Library" }));

    expect(launchCommand).toHaveBeenCalledWith({ name: "library", type: "userInitiated" });
  });

  it("reports a failure to open the library instead of throwing", async () => {
    await useTempLibrary();
    launchCommand.mockRejectedValueOnce(new Error("Command is disabled"));
    renderCommand(<Command />);

    await waitFor(() => expect(markdown()).toContain("Nothing to continue"));
    fireEvent.click(view().getByRole("button", { name: "Open My Library" }));

    await waitFor(() =>
      expect(toasts.at(-1)).toMatchObject({ title: "Could not open My Library", message: "Command is disabled" }),
    );
  });

  it("opens the last book at its saved position", async () => {
    const store = await useTempLibrary();
    const book = await store.create(sampleBook());
    await rememberLastOpened(book.id);

    renderCommand(<Command />);

    await waitFor(() => expect(markdown()).toContain("When I wrote"));
  });

  it.each([
    ["deleted", () => randomUUID()],
    ["malformed", () => "not-a-book-id"],
  ])("ignores a %s last book", async (_label, makeId) => {
    await useTempLibrary();
    await rememberLastOpened(makeId());

    renderCommand(<Command />);

    await waitFor(() => expect(markdown()).toContain("Nothing to continue"));
  });

  it("reports unreadable library data", async () => {
    const store = await useTempLibrary();
    const bookId = randomUUID();
    await mkdir(join(store.bookPath(bookId), "manifest.json"), { recursive: true });
    await rememberLastOpened(bookId);

    renderCommand(<Command />);

    await waitFor(() => expect(markdown()).toContain("Could not open your last book"));
  });
});
