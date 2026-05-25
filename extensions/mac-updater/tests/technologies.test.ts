import { test } from "node:test";
import * as assert from "node:assert/strict";
import { appUsesTech, computeTechnologyCounts } from "../src/utils/technologies";
import { InstalledApp } from "../src/utils/types";

function app(overrides: Partial<InstalledApp> = {}): InstalledApp {
  return {
    name: "Test",
    appPath: "/Applications/Test.app",
    bundleId: "com.example.test",
    version: "1.0",
    buildNumber: "1",
    hasAppStoreReceipt: false,
    isElectron: false,
    isApple: false,
    ...overrides,
  };
}

test("appUsesTech recognises Sparkle by feed URL", () => {
  assert.equal(appUsesTech(app({ sparkleFeedUrl: "https://example.com/appcast.xml" }), "sparkle"), true);
  assert.equal(appUsesTech(app(), "sparkle"), false);
});

test("appUsesTech recognises Electron by framework", () => {
  assert.equal(appUsesTech(app({ isElectron: true }), "electron"), true);
  assert.equal(appUsesTech(app(), "electron"), false);
});

test("appUsesTech recognises MAS by receipt OR known-install entry", () => {
  assert.equal(appUsesTech(app({ hasAppStoreReceipt: true }), "mas"), true);
  assert.equal(appUsesTech(app({ knownInstallKind: "mas" }), "mas"), true);
  assert.equal(appUsesTech(app(), "mas"), false);
});

test("appUsesTech recognises Homebrew via managed OR suggested cask", () => {
  assert.equal(appUsesTech(app({ managedByBrew: true }), "homebrew-cask"), true);
  assert.equal(appUsesTech(app({ suggestedCask: "test" }), "homebrew-cask"), true);
  assert.equal(appUsesTech(app(), "homebrew-cask"), false);
});

test("appUsesTech recognises GitHub via Sparkle feed pointing at github.com", () => {
  assert.equal(
    appUsesTech(app({ sparkleFeedUrl: "https://github.com/foo/bar/releases.atom" }), "github"),
    true
  );
  assert.equal(
    appUsesTech(app({ sparkleFeedUrl: "https://raw.githubusercontent.com/foo/bar/appcast.xml" }), "github"),
    true
  );
  assert.equal(appUsesTech(app({ sparkleFeedUrl: "https://example.com/appcast.xml" }), "github"), false);
  assert.equal(appUsesTech(app(), "github"), false);
});

test("computeTechnologyCounts tallies multi-source apps correctly", () => {
  const handbrake = app({
    name: "HandBrake",
    bundleId: "fr.handbrake.HandBrake",
    sparkleFeedUrl: "https://handbrake.fr/appcast.xml",
    managedByBrew: true,
  });
  const claude = app({ name: "Claude", isElectron: true, managedByBrew: true });
  const blackmagic = app({ name: "Blackmagic", hasAppStoreReceipt: true });

  const scan = {
    apps: [{ app: handbrake }, { app: claude }, { app: blackmagic }],
    unmanaged: [],
  } as any;

  const counts = computeTechnologyCounts(scan, 0);
  assert.equal(counts.sparkle, 1);
  assert.equal(counts.electron, 1);
  assert.equal(counts.mas, 1);
  assert.equal(counts["homebrew-cask"], 2); // HandBrake + Claude
});

test("computeTechnologyCounts respects adoption tally for Homebrew", () => {
  const scan = { apps: [], unmanaged: [] } as any;
  const counts = computeTechnologyCounts(scan, 4);
  assert.equal(counts["homebrew-cask"], 4);
});
