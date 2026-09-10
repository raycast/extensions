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

  it("doesn't overflow the call stack on a long flat run of optional atoms", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "a?".repeat(5000) + "b" });
    assert.equal(matcher!({ ...powershell, name: "b" }), true);
  });

  it("treats \\b and \\B as word boundaries, not literal letters", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "\\bPowerShell\\b" })!(powershell), true);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "\\bCommand\\b Prompt" }), ["Command Prompt"]);
    // There's no boundary mid-word, so \b can't split PowerShell between "Power" and "Shell".
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power\\bShell" }), []);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "Power\\BShell" }), ["PowerShell"]);
  });

  it("honors the (?i) inline case-insensitivity flag", () => {
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i)powershell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i:power)Shell" }), ["PowerShell"]);
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?i)[p]owershell" }), ["PowerShell"]);
    // The flag lapses at the end of the group that set it, so "SHELL" stays case-sensitive.
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:(?i)power)SHELL" }), []);
  });

  it("rejects an escape it doesn't implement instead of matching it as a literal", () => {
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "\\p{L}+" }), null);
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "(PowerShell)\\1" }), null);
  });

  it("compiles and matches a large bounded quantifier on a simple atom, not just a small one", () => {
    // (a|b){0,4000} and a{0,12000} are the exact patterns raised in review: a large bound on a
    // simple atom is valid ICU syntax and must actually match, not be rejected outright.
    const wide = buildProfileMatcher({ type: "matchProfiles", name: "(a|b){0,4000}" });
    assert.notEqual(wide, null);
    assert.equal(wide!({ ...powershell, name: "a".repeat(4000) }), true);
    assert.equal(wide!({ ...powershell, name: "ab".repeat(2000) }), true);
    assert.equal(wide!({ ...powershell, name: "a".repeat(4001) }), false);
    assert.equal(wide!({ ...powershell, name: "c".repeat(4000) }), false);

    const literal = buildProfileMatcher({ type: "matchProfiles", commandline: "a{0,12000}" });
    assert.notEqual(literal, null);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(2000) }), true);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(12000) }), true);
    assert.equal(literal!({ ...powershell, commandline: "a".repeat(12001) }), false);
  });

  it("matches a large bounded quantifier quickly, since it no longer scales with the bound", () => {
    const matcher = buildProfileMatcher({ type: "matchProfiles", commandline: "a{0,12000}" });
    const start = Date.now();
    matcher!({ ...powershell, commandline: "a".repeat(2000) });
    assert.ok(Date.now() - start < 200, "matching took too long");
  });

  it("rejects a large quantifier wrapping content that has its own quantifier", () => {
    // compileCountedRepeat's counter can't represent two independently-active repeats, so this
    // falls back to being rejected (consistent with any other unsupported construct) rather than
    // silently compiling something that would count wrong.
    const start = Date.now();
    assert.equal(buildProfileMatcher({ type: "matchProfiles", name: "((a|b){200}){200}" }), null);
    assert.ok(Date.now() - start < 1000, "compiling took too long");
    // A large quantifier around plain (unquantified) content is unaffected.
    assert.deepEqual(matchedNames({ type: "matchProfiles", name: "(?:PowerShell){1,200}" }), ["PowerShell"]);
  });

  it("still unrolls a small quantifier, so it can nest inside another quantifier", () => {
    // (a?)* mixes two quantifiers, one nested in the other — only possible because both are
    // small enough to unroll; compileCountedRepeat's single counter couldn't represent this.
    const matcher = buildProfileMatcher({ type: "matchProfiles", name: "(a{2,5})*" });
    assert.equal(matcher!({ ...powershell, name: "aaa" }), true);
    assert.equal(matcher!({ ...powershell, name: "aaaaa" + "aaa" }), true);
    assert.equal(matcher!({ ...powershell, name: "a" }), false);
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
