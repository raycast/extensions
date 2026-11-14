import test from "node:test";
import { assetPath, fixturePath, readAsset, readFixture, swiftFunction, runSwiftHarness } from "./swift-harness.ts";

for (const engine of ["chromium", "webkit", "firefox"]) {
  test(`${engine} switches the exact identical tab after reorder and rejects closed or foreign references`, () => {
    const source = readAsset(`${engine}-ax.swift`);
    const types = source.slice(
      source.indexOf("struct NativeWindowInput"),
      source.indexOf("\nfunc ", source.indexOf("struct NativeWindowInput")),
    );
    const functions = ["buildWindowOutput", "handleFocus"];
    if (engine === "chromium") functions.unshift("chromiumBrowserPolicy", "matchUrlsByTitle");
    if (engine === "webkit")
      functions.push(
        "focusTabViaAppleEvent",
        "matchedTabURL",
        "preferredWindowURL",
        "appleEventTabs",
        "buildWindowWithoutAX",
        "buildWindowWithoutTabControls",
      );

    // Exercise production list/focus functions and the shared reference store; only OS calls are stubbed.
    const main = [
      "import Foundation",
      types,
      "private let tabReferences = TabReferenceStore()",
      ...functions.map((name) => swiftFunction(source, name).split("\nprivate let tabReferences")[0]),
      readFixture("tab-identity-scenarios.swift"),
      engine === "webkit" ? "assertNonBrowserDialogIsExcluded(); assertWebKitURLsFollowTabs()" : "",
      engine === "firefox" ? "assertHiddenTabsAreUnavailable()" : "",
    ].join("\n");
    runSwiftHarness(main, [
      assetPath("browser-tab-references.swift"),
      fixturePath("tab-identity-support.swift"),
      fixturePath(`tab-identity-${engine}.swift`),
    ]);
  });
}

test("WebKit fallback preserves URL source priority and fills only the active AppleEvent tab", () => {
  const source = readAsset("webkit-ax.swift");
  const types = source.slice(
    source.indexOf("struct NativeWindowInput"),
    source.indexOf("\nfunc ", source.indexOf("struct NativeWindowInput")),
  );
  runSwiftHarness(
    [
      "import Foundation\ntypealias AXUIElement = Int",
      types,
      swiftFunction(source, "preferredWindowURL"),
      swiftFunction(source, "appleEventTabs"),
      `let inspection = WindowAXInspection(webAreaUrl: "web", addressBarUrl: "address")
    precondition(preferredWindowURL(documentURL: "document", inspection: inspection, fallbackURL: "native") == "document")
    precondition(preferredWindowURL(documentURL: "", inspection: inspection, fallbackURL: "native") == "web")
    let addressOnly = WindowAXInspection(addressBarUrl: "address")
    precondition(preferredWindowURL(documentURL: "", inspection: addressOnly, fallbackURL: "native") == "native")
    precondition(preferredWindowURL(documentURL: "", inspection: addressOnly, fallbackURL: nil) == "address")
    let candidate = AEWindowCandidate(windowId: 10, titles: ["", "Other", "Known"], urls: ["", "", "known"])
    let tabs = appleEventTabs(candidate, windowId: "10", fallbackTitle: "Window", activeURL: "active")
    precondition(tabs.map { $0.title } == ["Window", "Other", "Known"])
    precondition(tabs.map { $0.url } == ["active", "", "known"])
    precondition(appleEventTabs(candidate, windowId: "10").map { $0.url } == ["", "", "known"])`,
    ].join("\n"),
  );
});
