import assert from "node:assert/strict";
import test from "node:test";
import {
  getSaveKind,
  getSaveSourceTitle,
  joinNoteParts,
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

test("titles describe where the prefill came from", () => {
  assert.equal(getSaveSourceTitle(tab), "Current Tab in Dia");
  assert.equal(getSaveSourceTitle({ ...tab, appName: undefined }), "Current Tab");
  assert.equal(getSaveSourceTitle(finder), "Finder (2 files)");
  assert.equal(getSaveSourceTitle({ id: "finder", input: { kind: "files", value: ["/tmp/a.png"] } }), "Finder (a.png)");
  assert.equal(getSaveSourceTitle(clipboard), "Clipboard (Link)");
  assert.equal(getSaveSourceTitle({ id: "clipboard", input: { kind: "note", value: "hi" } }), "Clipboard (Text)");
  assert.equal(getSaveSourceTitle(selection), "Selected Text");
});

test("works out what to save from what's filled in", () => {
  assert.equal(getSaveKind("", []), undefined);
  assert.equal(getSaveKind("   ", []), undefined);
  assert.equal(getSaveKind(" https://raycast.com ", []), "url");
  assert.equal(getSaveKind("raycast.com", []), "note");
  assert.equal(getSaveKind("a thought", []), "note");
  assert.equal(getSaveKind("https://raycast.com", ["/tmp/a.png"]), "file");
  assert.equal(getSaveKind("", ["/tmp/a.png"]), "file");
});

test("joins note parts and drops empty ones", () => {
  assert.equal(joinNoteParts("https://raycast.com", " great read "), "https://raycast.com\n\ngreat read");
  assert.equal(joinNoteParts("", "only this", "  "), "only this");
  assert.equal(joinNoteParts(), "");
});
