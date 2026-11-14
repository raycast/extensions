import assert from "node:assert/strict";
import test from "node:test";
import { assetPath, fixturePath, readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

test("Opera list and focus reach its deep tab strip and preserve the exact tab after reorder", () => {
  const source = readAsset("chromium-ax.swift");
  const types = source.slice(
    source.indexOf("struct NativeWindowInput"),
    source.indexOf("\nfunc ", source.indexOf("struct NativeWindowInput")),
  );
  const functions = [
    "chromiumBrowserPolicy",
    "collectChromiumTabs",
    "matchUrlsByTitle",
    "buildWindowOutput",
    "handleList",
    "handleFocus",
  ];
  const output = runSwiftHarness(
    [
      "import Foundation",
      types,
      "private let tabReferences = TabReferenceStore()",
      ...functions.map((name) => swiftFunction(source, name).split("\nprivate let tabReferences")[0]),
      `try handleList(args: ["Opera", "[{\\\"id\\\":10,\\\"pid\\\":20,\\\"space\\\":2,\\\"title\\\":\\\"Same\\\"}]"])
    let target = tabReferences.register(windowId: 10, element: operaTabs[1], fallbackIndex: 1)
    tabGroup.children = [operaTabs[2], operaTabs[0], operaTabs[1]]
    try handleFocus(args: ["Opera", "10", target, "Same", "20"])
    precondition(pressed == ["target"], "Reordering same-title tabs must not change the focus target")
    try handleList(args: ["Google Chrome", "[{\\\"id\\\":10,\\\"pid\\\":20,\\\"title\\\":\\\"Same\\\"}]"])`,
    ].join("\n"),
    [assetPath("browser-tab-references.swift"), fixturePath("opera-native.swift")],
  );
  const [list, focused, chrome] = output.trim().split("\n");
  const windows = JSON.parse(list);
  assert.equal(windows[0].tabs.length, 3);
  assert(windows[0].tabs.every((tab: { id: string }) => tab.id.includes(":ax:")));
  assert.equal(focused, "ok");
  assert.equal(JSON.parse(chrome)[0].tabs.length, 1, "other Chromium browsers retain their original traversal budget");
});

test("Opera URL enrichment uses its scripting tab class while Chrome keeps the Chromium class", () => {
  const source = readAsset("chromium-ax.swift");
  runSwiftHarness(
    [
      "import AppKit\nimport Carbon",
      swiftFunction(source, "fourCC"),
      swiftFunction(source, "chromiumBrowserPolicy"),
      swiftFunction(source, "fetchAppleEventTabUrlsByPid"),
      `var requestedClasses: [FourCharCode] = []
    func queryAppleEventNestedStrings(pid: Int32, prop: FourCharCode, tabClass: FourCharCode = fourCC("CrTb")) -> [[String]]? {
      requestedClasses.append(tabClass)
      return prop == fourCC("URL ") ? [["https://opera.example/background"]] : [["Background"]]
    }
    func fetchTabsViaAppleScript(appName: String) -> [(titles: [String], urls: [String])]? {
      preconditionFailure("Successful native queries must not use the script fallback")
    }
    for (app, tabClass) in [("Opera", "OpTb"), ("Google Chrome", "CrTb")] {
      requestedClasses = []
      let windows = fetchAppleEventTabUrlsByPid(pid: 20, appName: app)!
      precondition(requestedClasses == [fourCC(tabClass), fourCC(tabClass)], "Wrong browser tab class")
      precondition(windows[0].urls == ["https://opera.example/background"])
      precondition(windows[0].titles == ["Background"])
    }`,
    ].join("\n"),
  );
});
