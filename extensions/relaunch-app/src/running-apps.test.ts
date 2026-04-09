import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLsappinfoOutput } from "./running-apps";

describe("parseLsappinfoOutput", () => {
  it("returns only foreground apps and excludes system apps", () => {
    const sample = `
  1) "Finder" ASN:0x0-0x10010:
    bundleID="com.apple.finder"
    bundle path="/System/Library/CoreServices/Finder.app"
    pid = 305
    type="Foreground"
  2) "Dock" ASN:0x0-0x10011:
    bundleID="com.apple.dock"
    bundle path="/System/Library/CoreServices/Dock.app"
    pid = 222
    type="Foreground"
  3) "Spotify" ASN:0x0-0x10012:
    bundleID="com.spotify.client"
    bundle path="/Applications/Spotify.app"
    pid = 999
    type="Background"
  4) "Arc" ASN:0x0-0x10013:
    bundleID="company.thebrowser.Browser"
    bundle path="/Applications/Arc.app"
    pid = 700
    type="Foreground"
`;

    assert.deepEqual(parseLsappinfoOutput(sample), [
      {
        name: "Arc",
        pid: "700",
        bundleId: "company.thebrowser.Browser",
        bundlePath: "/Applications/Arc.app",
      },
      {
        name: "Finder",
        pid: "305",
        bundleId: "com.apple.finder",
        bundlePath: "/System/Library/CoreServices/Finder.app",
      },
    ]);
  });

  it("keeps apps without bundle metadata when name and pid exist", () => {
    const sample = `
  1) "Some App" ASN:0x0-0x10020:
    pid = 1234
    type="Foreground"
`;

    assert.deepEqual(parseLsappinfoOutput(sample), [
      {
        name: "Some App",
        pid: "1234",
        bundleId: undefined,
        bundlePath: undefined,
      },
    ]);
  });
});
