import type { Window as NativeWindow } from "../src/windows";
import assert from "node:assert/strict";
import test from "node:test";
import { fixturePath, readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

test("native list retains minimized dialogs and off-space apps without exposing utility windows", () => {
  const source = readAsset("macos-windows.swift");
  const types = source.slice(source.indexOf("struct WindowFrame"), source.indexOf("func copyAttr"));
  // Replace only OS discovery calls; execute the production list pipeline and types.
  const list = swiftFunction(source, "handleList")
    .replaceAll("CGWindowListCopyWindowInfo(", "fixtureWindowInfo(")
    .replaceAll("NSRunningApplication(", "FixtureApplication(");
  const main = [
    "import AppKit\nimport ApplicationServices\nimport CoreGraphics\nimport Foundation",
    types,
    list,
    "try handleList()",
  ].join("\n");
  const windows: NativeWindow[] = JSON.parse(runSwiftHarness(main, [fixturePath("native-windows-support.swift")]));
  assert.deepEqual(
    windows.map((window) => window.id).sort((a, b) => a - b),
    [10, 11, 12, 17, 20, 22, 23, 25, 26],
    "minimized/hidden dialogs and off-space app records must survive; utility, transparent and tiny windows must not",
  );
  assert.equal(windows.find((window) => window.id === 10)!.space, 0);
  assert.equal(windows.find((window) => window.id === 12)!["has-ax-reference"], true);
  assert.equal(windows.find((window) => window.id === 17)!["has-ax-reference"], false);
  assert.equal(windows.find((window) => window.id === 20)!["has-ax-reference"], false);
  assert.equal(windows.find((window) => window.id === 22)!.subrole, "AXDialog");
  assert.equal(windows.find((window) => window.id === 25)!.space, 0);
  assert.equal(windows.find((window) => window.id === 25)!["has-ax-reference"], false);
  assert.equal(windows.find((window) => window.id === 10)!.isMinimized, true);
  assert.equal(windows.find((window) => window.id === 10)!.frontOrder, 0);
  assert.equal(windows.find((window) => window.id === 12)!.isHidden, true);
  assert.equal(windows.find((window) => window.id === 25)!.isMinimized, undefined);
});
