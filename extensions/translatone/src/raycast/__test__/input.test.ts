import { beforeEach, describe, expect, test } from "bun:test";
import { clipboardPreview, initialSearchText, queryFor } from "../../core/input";
import { readInitialInput } from "../input";
import { raycast } from "./test-helpers";

describe("readInitialInput", () => {
  beforeEach(() => raycast.reset());

  test("reads the text selected in the frontmost app", async () => {
    raycast.selectedText = "Halo dunia";

    expect(await readInitialInput()).toEqual({ text: "Halo dunia", source: "selection" });
  });

  test("falls back to the latest clipboard entry", async () => {
    raycast.clipboard.push("Older", "Latest copy");

    expect(await readInitialInput()).toEqual({ text: "Latest copy", source: "clipboard" });
  });

  test("keeps matching clipboard text as a local preview until submitted in Translate", async () => {
    raycast.selectedText = "Copied text";
    raycast.clipboard.push("Copied text");

    const initial = await readInitialInput();

    expect(initial).toEqual({ text: "Copied text", source: "clipboard" });
    expect(initialSearchText(initial)).toBe("");
    expect(clipboardPreview(initial, "", undefined)).toBe("Copied text");
    expect(queryFor(initial, "", undefined)).toBe("");
    expect(queryFor(initial, "", "Copied text")).toBe("Copied text");
  });

  test("starts empty when there is nothing to read", async () => {
    expect(await readInitialInput()).toEqual({ text: "", source: "none" });
  });
});
