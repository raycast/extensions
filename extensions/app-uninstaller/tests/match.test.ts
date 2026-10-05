import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InstalledApp } from "../src/lib/apps";
import { attribute, buildMatcher, classify, normalizeEntry } from "../src/lib/match";

function app(name: string, bundleId: string, aliases: string[] = []): InstalledApp {
  return { path: `/Applications/${name}.app`, name, bundleId, aliases, fromAppStore: false };
}

const bitwarden = buildMatcher(app("Bitwarden", "com.bitwarden.desktop"));

describe("normalizeEntry", () => {
  it("strips file extensions macOS adds", () => {
    assert.equal(normalizeEntry("com.bitwarden.desktop.plist"), "com.bitwarden.desktop");
    assert.equal(normalizeEntry("com.bitwarden.desktop.savedState"), "com.bitwarden.desktop");
    assert.equal(normalizeEntry("com.bitwarden.desktop.binarycookies"), "com.bitwarden.desktop");
  });

  it("strips the ByHost UUID", () => {
    assert.equal(
      normalizeEntry("com.bitwarden.desktop.532CB090-2154-5AA6-AAAE-5F0781AFBBB7.plist"),
      "com.bitwarden.desktop",
    );
  });

  it("strips the developer Team ID from group containers", () => {
    assert.equal(normalizeEntry("LTZ2PFU5D6.com.bitwarden.desktop"), "com.bitwarden.desktop");
  });

  it("leaves a plain name alone", () => {
    assert.equal(normalizeEntry("Bitwarden"), "Bitwarden");
  });
});

describe("classify", () => {
  it("treats the bundle identifier as certain", () => {
    assert.equal(classify("com.bitwarden.desktop", bitwarden)?.confidence, "high");
    assert.equal(classify("com.bitwarden.desktop.safari", bitwarden)?.confidence, "high");
    assert.equal(classify("LTZ2PFU5D6.com.bitwarden.desktop", bitwarden)?.confidence, "high");
  });

  it("treats the application name as likely", () => {
    assert.equal(classify("Bitwarden", bitwarden)?.confidence, "medium");
    assert.equal(classify("bitwarden", bitwarden)?.confidence, "medium");
  });

  it("treats a developer-wide or partial hit as unsure", () => {
    assert.equal(classify("com.bitwarden.cli", bitwarden)?.confidence, "low");
    assert.equal(classify("Bitwarden Backup", bitwarden)?.confidence, "low");
  });

  it("does not match unrelated entries", () => {
    assert.equal(classify("com.apple.Safari", bitwarden), null);
    assert.equal(classify("Slack", bitwarden), null);
  });

  it("ignores names too generic to identify an app", () => {
    const helper = buildMatcher(app("Helper", "com.example.helper", ["Updater"]));
    assert.equal(classify("Helper", helper), null);
    assert.equal(classify("Updater", helper), null);
    assert.equal(classify("com.example.helper", helper)?.confidence, "high");
  });
});

describe("attribute", () => {
  const chrome = app("Chrome", "com.google.Chrome");
  const drive = app("Google Drive", "com.google.GoogleDrive");
  const others = [chrome, drive].map(buildMatcher);
  const chromeMatcher = buildMatcher(chrome);

  it("keeps an entry only this app claims", () => {
    assert.equal(attribute("com.google.Chrome", chromeMatcher, others)?.match.confidence, "high");
  });

  it("drops an entry another app claims more strongly", () => {
    assert.equal(attribute("com.google.GoogleDrive", chromeMatcher, others), null);
  });

  it("demotes an entry two apps claim equally", () => {
    const one = buildMatcher(app("Notion", "com.notion.desktop"));
    const two = buildMatcher(app("Notion Calendar", "com.notion.calendar"));
    const shared = attribute("com.notion.shared", one, [one, two]);
    assert.equal(shared?.match.confidence, "low");
    assert.equal(shared?.conflictsWith?.name, "Notion Calendar");
  });
});
