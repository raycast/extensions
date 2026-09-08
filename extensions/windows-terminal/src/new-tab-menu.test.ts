import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProfileMatcher, resolveNewTabMenuOrder } from "./new-tab-menu.ts";
import type { NewTabMenuEntry, Profile } from "./new-tab-menu.ts";

const powershell: Profile = { guid: "{p1}", name: "PowerShell", commandline: "pwsh.exe" };
const commandPrompt: Profile = { guid: "{p2}", name: "Command Prompt", commandline: "cmd.exe" };
const ubuntu: Profile = { guid: "{p3}", name: "Ubuntu", source: "Microsoft.WSL" };
const azure: Profile = { guid: "{p4}", name: "Azure Cloud Shell", source: "Windows.Terminal.Azure" };
const profiles = [powershell, commandPrompt, ubuntu, azure];

function matchedNames(entry: NewTabMenuEntry) {
  const matcher = buildProfileMatcher(entry);
  return matcher ? profiles.filter(matcher).map((p) => p.name) : null;
}

describe("buildProfileMatcher", () => {
  it("never matches an empty source", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", source: ".*" }), ["Ubuntu", "Azure Cloud Shell"]);
  });

  it("never matches an empty commandline", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: ".*" }), ["PowerShell", "Command Prompt"]);
  });

  it("matches the whole field, not a substring", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power" }), []);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power.*" }), ["PowerShell"]);
  });

  it("matches when any single field matches", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Nothing", source: "Microsoft.WSL" }), ["Ubuntu"]);
  });

  it("matches nothing without patterns or with a malformed regex", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[" }), null);
  });
});

describe("resolveNewTabMenuOrder", () => {
  it("places an explicit profile after remainingProfiles", () => {
    const order = resolveNewTabMenuOrder(profiles, [
      { type: "remainingProfiles" },
      { type: "profile", profile: "PowerShell" },
    ]);
    assert.deepEqual(order, ["{p2}", "{p3}", "{p4}", "{p1}"]);
  });

  it("counts references inside folders when expanding the remainder", () => {
    const order = resolveNewTabMenuOrder(profiles, [
      { type: "remainingProfiles" },
      { type: "folder", entries: [{ type: "matchProfiles", source: ".*" }] },
    ]);
    assert.deepEqual(order, ["{p1}", "{p2}", "{p3}", "{p4}"]);
  });
});
