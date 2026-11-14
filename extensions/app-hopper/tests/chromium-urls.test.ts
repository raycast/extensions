import test from "node:test";
import { fixturePath, readAsset, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

test("Chromium leaves identical window titles unresolved instead of reusing the first URL", () => {
  runSwiftHarness(`
    ${swiftFunction(readAsset("chromium-ax.swift"), "matchUrlsByTitle").split("\nprivate let tabReferences")[0]}
    let candidates = [
      (titles: ["Dashboard"], urls: ["https://one.example"]),
      (titles: ["Dashboard"], urls: ["https://two.example"])
    ]
    let first = matchUrlsByTitle(tabTitles: ["Dashboard"], candidates: candidates)
    let second = matchUrlsByTitle(tabTitles: ["Dashboard"], candidates: candidates)
    precondition(first == nil && second == nil, "Ambiguous windows received an arbitrary URL")
  `);
});

test("Chromium uses known AX URLs to distinguish windows, consumes matches, and avoids positional fallbacks", () => {
  const source = readAsset("chromium-ax.swift");
  runSwiftHarness(
    `
    import Foundation
    ${source.slice(source.indexOf("struct NativeWindowInput"), source.indexOf("\nfunc ", source.indexOf("struct NativeWindowInput")))}
    ${swiftFunction(source, "matchUrlsByTitle")}
    ${swiftFunction(source, "buildWindowOutput")}

    func snapshot(_ wid: CGWindowID, _ titles: [String], activeUrl: String = "",
      candidates: inout [(titles: [String], urls: [String])]) -> [String] {
      let tabs = titles.enumerated().map { AXUIElement($0.element, selected: $0.offset == 0) }
      let window = AXUIElement("Window", url: activeUrl, tabs: tabs)
      return buildWindowOutput(wid: wid, axWindow: window, fallbackTitle: nil,
        fallbackDocUrl: nil, space: nil, aeCandidates: &candidates)!.tabs.map { $0.url }
    }
    var candidates = [
      (titles: ["Dashboard", "Docs"], urls: ["https://one.example", "https://one.example/docs"]),
      (titles: ["Dashboard", "Docs"], urls: ["https://two.example", "https://two.example/docs"])
    ]
    let titles = ["Dashboard", "Docs - 已固定"]
    precondition(snapshot(10, titles, candidates: &candidates) == ["", ""])
    precondition(candidates.count == 2, "Ambiguous windows must not consume candidates")
    precondition(snapshot(11, titles, activeUrl: "https://two.example", candidates: &candidates)
      == ["https://two.example", "https://two.example/docs"])
    precondition(candidates.count == 1 && candidates[0].urls[0] == "https://one.example")
    precondition(snapshot(10, titles, activeUrl: "https://one.example", candidates: &candidates)
      == ["https://one.example", "https://one.example/docs"])
    precondition(candidates.isEmpty, "Matched candidates must not be reused")

    candidates = [(titles: ["Other", "Tab"], urls: ["https://other.example", "https://tab.example"])]
    precondition(snapshot(12, titles, candidates: &candidates) == ["", ""],
      "Equal tab counts alone must not assign URLs")
    precondition(snapshot(12, titles, activeUrl: "https://known.example", candidates: &candidates)
      == ["https://known.example", ""], "Known AX URLs survive an AppleEvent mismatch")

    candidates = [(titles: ["Same", "Same"], urls: ["https://a.example", "https://b.example"])]
    precondition(snapshot(13, ["Same", "Same"], candidates: &candidates) == ["", ""],
      "Duplicate titles within one window must not receive arbitrary URLs")

    candidates = [(titles: ["Short", "Short - Long"], urls: ["https://short.example", "https://long.example"])]
    precondition(snapshot(14, ["Short - Long"], candidates: &candidates) == ["https://long.example"],
      "Exact titles take precedence over suffix matches, including collapsed tab groups")
    `,
    [fixturePath("chromium-urls.swift")],
  );
});
