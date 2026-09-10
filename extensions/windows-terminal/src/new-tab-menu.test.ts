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

  it("keeps patterns that only look nested", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(Power)+Shell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:Power|Command)\\s.*" }), ["Command Prompt"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: "[a-z]+\\.exe" }), [
      "PowerShell",
      "Command Prompt",
    ]);
  });

  it("keeps a repeated group whose alternatives are disjoint", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", commandline: "(pwsh|cmd)+\\.exe" }), [
      "PowerShell",
      "Command Prompt",
    ]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(a|b)+" }), []);
  });

  it("bounds pathological patterns instead of rejecting or hanging on them", () => {
    // (a+)+, (a?a?)+, ((ab)+)+, (a|aa)* all cause exponential backtracking in a native regex
    // engine. The matcher still builds (the pattern is valid syntax) and returns fast with no
    // match, instead of freezing or silently dropping a pattern that could otherwise be safe.
    const adversarialName = "a".repeat(40) + "!";
    for (const pattern of ["(a+)+", "(a?a?)+", "((ab)+)+", "(a|aa)*"]) {
      const start = Date.now();
      const matcher = buildProfileMatcher({ type: "matchProfiles", name: pattern });
      assert.notEqual(matcher, null, pattern);
      assert.equal(matcher!({ ...powershell, name: adversarialName }), false, pattern);
      assert.ok(Date.now() - start < 1000, `${pattern} took too long`);
    }
  });

  it("treats ^ and $ as anchors, not literal characters", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "^PowerShell$" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "^Power.*$" }), ["PowerShell"]);
  });

  it("rejects a quantified anchor, matching Windows Terminal's regex engine", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^?PowerShell" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "PowerShell$?" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^*PowerShell" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "^{2}PowerShell" }), null);
  });

  it("matches a long linear value without excessive cost", () => {
    const longCommandline = "C:\\tools\\" + "a".repeat(1000) + ".exe";
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: "C:\\\\tools\\\\.*\\.exe" });
    assert.ok(matcher!({ ...powershell, commandline: longCommandline }));
  });

  it("doesn't overflow the call stack on a long value", () => {
    const longCommandline = "a".repeat(2000);
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: ".*" });
    assert.equal(matcher!({ ...powershell, commandline: longCommandline }), true);
  });

  it("doesn't let a zero-length repetition block the rest of the pattern", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(a?)*b" });
    assert.equal(matcher!({ ...powershell, name: "b" }), true);
  });

  it("supports negated escape classes inside a bracket expression", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "[\\D]+" })!(powershell), true);
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
