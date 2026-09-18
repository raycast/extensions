import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listNames, parseHolders } from "../src/lib/inuse";

// `lsof -F pcn` emits one field per line: p<pid>, c<command>, then n<path> per file.
function lsof(...lines: string[]): string {
  return lines.join("\n");
}

describe("parseHolders", () => {
  it("reports a process running an app extension from the bundle", () => {
    const holders = parseHolders(
      lsof("p93105", "cSafari", "n/Applications/Bitwarden.app/Contents/PlugIns/safari.appex/Contents/MacOS/safari"),
    );
    assert.deepEqual(holders, [{ name: "Safari", component: "safari" }]);
  });

  it("ignores a process that only has metadata open", () => {
    // Notification Center reading an icon does not block removal and is not
    // worth telling anyone about.
    const holders = parseHolders(
      lsof("p400", "cNotificationCenter", "n/Applications/Keynote.app/Contents/Resources/AppIcon.icns"),
    );
    assert.deepEqual(holders, []);
  });

  it("ignores Raycast, which is reading icons for the list itself", () => {
    const holders = parseHolders(lsof("p1", "cRaycast", "n/Applications/Foo.app/Contents/MacOS/Foo"));
    assert.deepEqual(holders, []);
  });

  it("counts frameworks and XPC services as loaded code", () => {
    const holders = parseHolders(
      lsof("p2", "cUpdater", "n/Applications/Foo.app/Contents/Frameworks/Sparkle.framework/Sparkle"),
      );
    assert.deepEqual(holders, [{ name: "Updater", component: "Sparkle" }]);
  });

  it("lists each process once, keeping the first component it matched", () => {
    const holders = parseHolders(
      lsof(
        "p3",
        "cArc",
        "n/Applications/Arc.app/Contents/MacOS/Arc",
        "n/Applications/Arc.app/Contents/Frameworks/Helper.framework/Helper",
      ),
    );
    assert.deepEqual(holders, [{ name: "Arc", component: "Arc" }]);
  });

  it("survives empty output, which is what a free bundle produces", () => {
    assert.deepEqual(parseHolders(""), []);
  });
});

describe("listNames", () => {
  it("reads as a sentence", () => {
    assert.equal(listNames([]), "");
    assert.equal(listNames(["Safari"]), "Safari");
    assert.equal(listNames(["Safari", "Finder"]), "Safari and Finder");
    assert.equal(listNames(["Safari", "Finder", "Dock"]), "Safari, Finder and Dock");
  });
});
