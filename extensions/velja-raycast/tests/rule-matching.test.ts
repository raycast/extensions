import { strict as assert } from "node:assert";
import test from "node:test";
import { findRulesByDomainOrUrl } from "../src/lib/rule-matching";
import { VeljaMatcher, VeljaRule } from "../src/lib/types";

function makeRule(id: string, matcher: VeljaMatcher): VeljaRule {
  return {
    id,
    title: `Rule ${id}`,
    browser: "com.apple.Safari",
    isEnabled: true,
    matchers: [matcher],
    sourceApps: [],
    forceNewWindow: false,
    openInBackground: false,
    onlyFromAirdrop: false,
    runAfterBuiltinRules: false,
    isTransformScriptEnabled: false,
    transformScript: "",
  };
}

test("matches host rules only on exact hostname", () => {
  const rules = [
    makeRule("R1", {
      id: "M1",
      kind: "host",
      pattern: "medium.com",
      fixture: "https://medium.com",
    }),
  ];

  const exactMatches = findRulesByDomainOrUrl(rules, "medium.com");
  assert.equal(exactMatches.length, 1);
  assert.equal(exactMatches[0].matchedMatchers[0].kind, "host");

  const subdomainMatches = findRulesByDomainOrUrl(rules, "blog.medium.com");
  assert.equal(subdomainMatches.length, 0);
});

test("matches hostSuffix rules for base domain and subdomains", () => {
  const rules = [
    makeRule("R2", {
      id: "M2",
      kind: "hostSuffix",
      pattern: "medium.com",
      fixture: "https://blog.medium.com",
    }),
  ];

  const baseMatches = findRulesByDomainOrUrl(rules, "medium.com");
  const subdomainMatches = findRulesByDomainOrUrl(rules, "blog.medium.com");

  assert.equal(baseMatches.length, 1);
  assert.equal(subdomainMatches.length, 1);
  assert.equal(subdomainMatches[0].matchedMatchers[0].kind, "hostSuffix");
});

test("matches urlPrefix rules for full URL and normalized domain query", () => {
  const rules = [
    makeRule("R3", {
      id: "M3",
      kind: "urlPrefix",
      pattern: "https://medium.com/path",
      fixture: "https://medium.com/path/article",
    }),
  ];

  const urlMatches = findRulesByDomainOrUrl(rules, "https://medium.com/path/article");
  assert.equal(urlMatches.length, 1);
  assert.equal(urlMatches[0].matchedMatchers[0].kind, "urlPrefix");

  const nonMatchingDomain = findRulesByDomainOrUrl(rules, "medium.com");
  assert.equal(nonMatchingDomain.length, 0);
});

test("returns all potentially applicable matcher kinds for a domain", () => {
  const rules = [
    makeRule("R4", {
      id: "M4",
      kind: "host",
      pattern: "medium.com",
      fixture: "https://medium.com",
    }),
    makeRule("R5", {
      id: "M5",
      kind: "hostSuffix",
      pattern: "medium.com",
      fixture: "https://blog.medium.com",
    }),
    makeRule("R6", {
      id: "M6",
      kind: "urlPrefix",
      pattern: "https://medium.com/",
      fixture: "https://medium.com/article",
    }),
  ];

  const matches = findRulesByDomainOrUrl(rules, "medium.com");
  const matchKinds = matches.flatMap((match) => match.matchedMatchers.map((matcher) => matcher.kind)).sort();

  assert.deepEqual(matchKinds, ["host", "hostSuffix", "urlPrefix"]);
});
