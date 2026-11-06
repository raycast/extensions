import assert from "node:assert/strict";
import test from "node:test";
import {
  getSaveKindForInput,
  getSaveSourceTitle,
  parseSaveKind,
  SaveSource,
  shouldReadSelectedText,
  sortSaveSources,
} from "./save-sources";

const tab: SaveSource = { id: "tab", input: { kind: "url", value: "https://example.com" }, appName: "Dia" };
const clipboard: SaveSource = { id: "clipboard", input: { kind: "url", value: "https://copied.com" } };
const selection: SaveSource = { id: "selection", input: { kind: "note", value: "a quote" } };
const finder: SaveSource = { id: "finder", input: { kind: "files", value: ["/tmp/a.png", "/tmp/b.png"] } };

test("orders sources as selection, tab, finder, clipboard", () => {
  assert.deepEqual(
    sortSaveSources([clipboard, undefined, finder, tab, selection]).map((source) => source.id),
    ["selection", "tab", "finder", "clipboard"],
  );
});

test("the browser tab beats a copied URL", () => {
  assert.equal(sortSaveSources([clipboard, tab])[0]?.id, "tab");
});

test("does not read selected text from Finder", () => {
  assert.equal(shouldReadSelectedText("com.apple.finder"), false);
  assert.equal(shouldReadSelectedText("com.apple.Finder"), false);
  assert.equal(shouldReadSelectedText("company.thebrowser.dia"), true);
  assert.equal(shouldReadSelectedText(undefined), true);
});

test("maps inputs to form kinds", () => {
  assert.equal(getSaveKindForInput(finder.input), "file");
  assert.equal(getSaveKindForInput(tab.input), "url");
  assert.equal(getSaveKindForInput(selection.input), "note");
});

test("parses only known kinds", () => {
  assert.equal(parseSaveKind("note"), "note");
  assert.equal(parseSaveKind("files"), undefined);
  assert.equal(parseSaveKind(undefined), undefined);
});

test("titles describe where the prefill came from", () => {
  assert.equal(getSaveSourceTitle(tab), "Current Tab in Dia");
  assert.equal(getSaveSourceTitle({ ...tab, appName: undefined }), "Current Tab");
  assert.equal(getSaveSourceTitle(finder), "Finder (2 files)");
  assert.equal(getSaveSourceTitle({ id: "finder", input: { kind: "files", value: ["/tmp/a.png"] } }), "Finder (a.png)");
  assert.equal(getSaveSourceTitle(clipboard), "Clipboard (Link)");
  assert.equal(getSaveSourceTitle({ id: "clipboard", input: { kind: "note", value: "hi" } }), "Clipboard (Text)");
  assert.equal(getSaveSourceTitle(selection), "Selected Text");
});
