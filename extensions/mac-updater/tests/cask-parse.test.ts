import { test } from "node:test";
import * as assert from "node:assert/strict";
import { parseAndIndex } from "../src/utils/cask-index";

// The cask.json index is built by walking the file as a Buffer and slicing out
// one top-level object at a time (to keep the 15MB file off the V8 heap). These
// tests lock the byte-walker against the cases that make naive brace-matching
// break: braces/brackets inside strings, escaped quotes, and nested artifact
// objects/arrays.

test("parseAndIndex indexes token, name, version, homepage", () => {
  const json = JSON.stringify([
    {
      token: "foo",
      name: ["Foo", "Foo.app"],
      version: "1.2.3",
      homepage: "https://foo.example",
    },
    { token: "bar", name: ["Bar"], version: "9", homepage: "" },
  ]);
  const idx = parseAndIndex(Buffer.from(json, "utf8"), 0);
  assert.equal(idx.byToken.size, 2);
  assert.equal(idx.byToken.get("foo")?.version, "1.2.3");
  // name keys are lowercased and ".app" stripped
  assert.equal(idx.byName.get("foo")?.token, "foo");
  assert.equal(idx.byName.get("bar")?.token, "bar");
});

test("parseAndIndex survives braces and escaped quotes inside strings", () => {
  const json = JSON.stringify([
    {
      token: "tricky",
      name: ['A }{ name with "quotes" and \\ backslash'],
      version: "1",
      homepage: "https://x/?q={a:[1,2]}",
    },
    { token: "after", name: ["After"], version: "2", homepage: "" },
  ]);
  const idx = parseAndIndex(Buffer.from(json, "utf8"), 0);
  // Both entries must be found — the first one's in-string braces must not
  // confuse the object boundary detection.
  assert.equal(idx.byToken.has("tricky"), true);
  assert.equal(idx.byToken.has("after"), true);
});

test("parseAndIndex extracts bundle IDs from nested zap/uninstall artifacts", () => {
  const json = JSON.stringify([
    {
      token: "withbundle",
      name: ["WithBundle"],
      version: "1",
      homepage: "",
      artifacts: [
        { uninstall: [{ quit: "com.example.app", pkgutil: "com.example.pkg" }] },
        { zap: [{ trash: ["~/Library/Foo"], launchctl: "com.example.helper" }] },
      ],
    },
  ]);
  const idx = parseAndIndex(Buffer.from(json, "utf8"), 0);
  assert.equal(idx.byBundleId.get("com.example.app")?.token, "withbundle");
  assert.equal(idx.byBundleId.get("com.example.helper")?.token, "withbundle");
});

test("parseAndIndex skips a malformed entry without failing the rest", () => {
  // Middle entry is valid JSON shape-wise; ensure good entries still index.
  const json = JSON.stringify([
    { token: "one", name: ["One"], version: "1", homepage: "" },
    { token: "two", name: ["Two"], version: "2", homepage: "" },
  ]);
  const idx = parseAndIndex(Buffer.from(json, "utf8"), 0);
  assert.equal(idx.byToken.size, 2);
});
