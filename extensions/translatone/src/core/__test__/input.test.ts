import { describe, expect, test } from "bun:test";
import {
  describeInputSource,
  clipboardPreview,
  initialSearchText,
  MAX_CLIPBOARD_PREFILL_LENGTH,
  queryFor,
  requestQuery,
  resolveInitialInput,
  searchPlaceholder,
  sourceOfSubmission,
  type InputReaders,
} from "../input";

function readers(selection: string | Error, clipboard: string | undefined): InputReaders {
  return {
    readSelection: () => (selection instanceof Error ? Promise.reject(selection) : Promise.resolve(selection)),
    readClipboard: () => Promise.resolve(clipboard),
  };
}

const noSelection = new Error("Unable to get selected text from frontmost application");

describe("resolveInitialInput", () => {
  test.each([
    ["the selection", readers("  Halo dunia  ", "something else"), "Halo dunia", "selection"],
    ["the clipboard when nothing is selected", readers(noSelection, "Copied text"), "Copied text", "clipboard"],
    ["the clipboard when the selection is blank", readers("   ", "Copied text"), "Copied text", "clipboard"],
    [
      "the clipboard when the selection only echoes it",
      readers("Copied text", "Copied text"),
      "Copied text",
      "clipboard",
    ],
    ["nothing when both are empty", readers(noSelection, undefined), "", "none"],
    ["nothing when the clipboard is blank", readers(noSelection, "  \n "), "", "none"],
  ] as const)("uses %s", async (_label, sources, text, source) => {
    expect(await resolveInitialInput(sources)).toEqual({ text, source });
  });

  test("keeps a long selection", async () => {
    const long = "a".repeat(MAX_CLIPBOARD_PREFILL_LENGTH + 1);

    expect(await resolveInitialInput(readers(long, undefined))).toEqual({
      text: long,
      source: "selection",
    });
  });

  test("ignores a clipboard too long to be a message", async () => {
    const long = "a".repeat(MAX_CLIPBOARD_PREFILL_LENGTH + 1);

    expect(await resolveInitialInput(readers(noSelection, long))).toEqual({
      text: "",
      source: "none",
    });
  });

  test("treats an unreadable clipboard as empty", async () => {
    const sources: InputReaders = {
      readSelection: () => Promise.reject(noSelection),
      readClipboard: () => Promise.reject(new Error("pasteboard unavailable")),
    };

    expect(await resolveInitialInput(sources)).toEqual({ text: "", source: "none" });
  });
});

describe("describeInputSource", () => {
  test.each([
    ["selection", "From selection"],
    ["clipboard", "From clipboard"],
    ["none", undefined],
  ] as const)("labels %s", (source, label) => {
    expect(describeInputSource(source)).toBe(label);
  });
});

describe("sourceOfSubmission", () => {
  const initial = { text: "Halo dunia", source: "selection" } as const;

  test.each([
    ["the pre-filled text unchanged", "Halo dunia", "selection"],
    ["the pre-filled text with extra spaces", "  Halo dunia \n", "selection"],
    ["edited text", "Halo dunia!", "none"],
  ] as const)("credits the source for %s", (_label, submitted, source) => {
    expect(sourceOfSubmission(initial, submitted)).toBe(source);
  });
});

const fromSelection = { text: "Halo dunia", source: "selection" } as const;
const fromClipboard = { text: "Copied text", source: "clipboard" } as const;
const fromNothing = { text: "", source: "none" } as const;

describe("clipboardPreview", () => {
  test("shows unsubmitted clipboard text without making it a translation query", () => {
    expect(clipboardPreview(fromClipboard, "", undefined)).toBe("Copied text");
    expect(clipboardPreview(fromClipboard, "  ", "Older clipboard")).toBe("Copied text");
    expect(clipboardPreview(fromClipboard, "", "Copied text")).toBeUndefined();
    expect(clipboardPreview(fromClipboard, "Typed", undefined)).toBeUndefined();
    expect(clipboardPreview(fromSelection, "", undefined)).toBeUndefined();
    expect(clipboardPreview(fromNothing, "", undefined)).toBeUndefined();
  });
});

describe("initialSearchText", () => {
  test.each([
    ["pre-fills the selection", fromSelection, "Halo dunia"],
    ["leaves the clipboard out of the search bar", fromClipboard, ""],
    ["starts empty without input", fromNothing, ""],
  ] as const)("%s", (_label, initial, text) => {
    expect(initialSearchText(initial)).toBe(text);
  });
});

describe("queryFor", () => {
  test.each([
    ["keeps the clipboard local until submitted", fromClipboard, "  ", ""],
    ["replaces the clipboard with typed text", fromClipboard, "Typed", "Typed"],
    ["uses the typed selection text", fromSelection, "Halo dunia", "Halo dunia"],
    ["keeps an empty search empty without a clipboard", fromSelection, "", ""],
  ] as const)("%s", (_label, initial, typed, query) => {
    expect(queryFor(initial, typed, undefined)).toBe(query);
  });

  test("translates the clipboard only after submitting that preview", () => {
    expect(queryFor(fromClipboard, "", "Copied text")).toBe("Copied text");
    expect(queryFor(fromClipboard, "", "Older clipboard")).toBe("");
    expect(queryFor(fromClipboard, "Typed", "Copied text")).toBe("Typed");
  });
});

describe("requestQuery", () => {
  test("does not resend a submitted clipboard while a new typed query is debouncing", () => {
    const oldClipboardQuery = queryFor(fromClipboard, "", "Copied text");
    const currentTypedQuery = queryFor(fromClipboard, "Typed", undefined);

    expect(requestQuery(currentTypedQuery, oldClipboardQuery)).toBe("");
    expect(requestQuery(currentTypedQuery, "Typed")).toBe("Typed");
    expect(requestQuery(queryFor(fromClipboard, "", undefined), oldClipboardQuery)).toBe("");
    expect(requestQuery(" Typed ", "Typed")).toBe("Typed");
  });
});

describe("searchPlaceholder", () => {
  test.each([
    ["invites replacing the clipboard", fromClipboard, "Type to replace the clipboard text…"],
    ["invites typing otherwise", fromNothing, "Type or paste text to translate…"],
  ] as const)("%s", (_label, initial, placeholder) => {
    expect(searchPlaceholder(initial)).toBe(placeholder);
  });
});
