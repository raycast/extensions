import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { helperArguments, validateAppPath } from "../src/commands.ts";

test("uses the exact Highlight AI path and rejects similarly named apps", () => {
  assert.equal(validateAppPath(""), "/Applications/Highlight.app");
  assert.throws(() => validateAppPath("/Applications/Highlights.app"));
  assert.throws(() => validateAppPath("/Applications/Highlighter.app"));
  assert.throws(() => validateAppPath("Highlight.app"));
});
test("passes paths as separate arguments without evaluating shell syntax", () => {
  const appPath = "/Users/example/$(anything)/Highlight.app";
  assert.deepEqual(helperArguments("/assets/control.js", appPath, "search"), [
    "-l",
    "JavaScript",
    "/assets/control.js",
    appPath,
    "search",
  ]);
});
test("rejects arbitrary key injection and unsupported actions", () => {
  assert.throws(() =>
    helperArguments(
      "/assets/control.js",
      "/Applications/Highlight.app",
      "delete",
    ),
  );
});

test("requires the confirmed bundle ID even when an unrelated app copies Highlight's name", () => {
  const source = readFileSync(
    new URL("../assets/control-highlight.js", import.meta.url),
    "utf8",
  );
  const predicate = source.match(
    /function isHighlightBundle\(info\) \{[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(
    predicate,
    "The native helper must expose its pure identity predicate for this safety check",
  );
  // Evaluate only the pure predicate: no helper entry point, ObjC imports, or native UI calls run.
  const isHighlightBundle = vm.runInNewContext(`(${predicate})`) as (
    info: unknown,
  ) => boolean;
  const info = {
    CFBundleName: "Highlight",
    CFBundleExecutable: "Highlight",
    CFBundleIdentifier: "tv.medal.highlight",
  };
  assert.equal(isHighlightBundle(info), true);
  for (const bundleId of [
    "com.example.highlight",
    "com.cocoatype.Highlighter",
    "net.highlightsapp.universal",
    "",
    undefined,
  ]) {
    assert.equal(
      isHighlightBundle({ ...info, CFBundleIdentifier: bundleId }),
      false,
    );
  }
  assert.equal(
    isHighlightBundle({ ...info, CFBundleName: "Highlights" }),
    false,
  );
  assert.equal(
    isHighlightBundle({ ...info, CFBundleExecutable: "Highlighter" }),
    false,
  );
  assert.equal(isHighlightBundle(null), false);
  assert.equal(isHighlightBundle(undefined), false);
});

test("checks bundle identity before accessing native UI or delivering keys", () => {
  const source = readFileSync(
    new URL("../assets/control-highlight.js", import.meta.url),
    "utf8",
  );
  const guard = source.indexOf(
    'if (!isHighlightBundle(info)) throw new Error("HIGHLIGHT_IDENTITY")',
  );
  assert.notEqual(guard, -1);
  for (const nativeOperation of [
    'Application("System Events")',
    "process.frontmost = true",
    "system.keystroke(",
  ]) {
    assert.ok(
      source.indexOf(nativeOperation) > guard,
      `${nativeOperation} must remain after identity validation`,
    );
  }
});
