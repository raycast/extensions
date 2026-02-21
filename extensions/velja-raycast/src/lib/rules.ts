import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { VeljaMatcher, VeljaMatcherKind, VeljaRule } from "./types";
import { VELJA_BUNDLE_ID, readVeljaConfig } from "./velja";

export interface CreateRuleInput {
  title: string;
  browser: string;
  matcherKind: VeljaMatcherKind;
  matcherPattern: string;
  matcherFixture: string;
  sourceApps: string[];
  forceNewWindow: boolean;
  openInBackground: boolean;
  onlyFromAirdrop: boolean;
  runAfterBuiltinRules: boolean;
  isTransformScriptEnabled: boolean;
  transformScript: string;
}

function toVeljaUuid(): string {
  return randomUUID().toUpperCase();
}

function quoteDefaultsArrayString(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function writeRules(rules: VeljaRule[]): void {
  const serializedRules = rules.map((rule) => quoteDefaultsArrayString(JSON.stringify(rule)));
  const args = ["write", VELJA_BUNDLE_ID, "rules", "-array", ...serializedRules];

  const result = spawnSync("defaults", args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });

  if (result.status !== 0) {
    const error = result.stderr.trim() || "Failed to write Velja rules";
    throw new Error(error);
  }
}

export function listRules(): VeljaRule[] {
  return readVeljaConfig().rules;
}

export function toggleRule(ruleId: string): VeljaRule {
  const rules = listRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);

  if (index < 0) {
    throw new Error("Rule not found");
  }

  const updatedRule = {
    ...rules[index],
    isEnabled: !rules[index].isEnabled,
  };

  const updatedRules = [...rules];
  updatedRules[index] = updatedRule;
  writeRules(updatedRules);
  return updatedRule;
}

export function deleteRule(ruleId: string): void {
  const rules = listRules();
  const updatedRules = rules.filter((rule) => rule.id !== ruleId);

  if (updatedRules.length === rules.length) {
    throw new Error("Rule not found");
  }

  writeRules(updatedRules);
}

export function updateRuleBrowser(ruleId: string, browserIdentifier: string): VeljaRule {
  const rules = listRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);

  if (index < 0) {
    throw new Error("Rule not found");
  }

  const updatedRule: VeljaRule = {
    ...rules[index],
    browser: browserIdentifier,
  };

  const updatedRules = [...rules];
  updatedRules[index] = updatedRule;
  writeRules(updatedRules);
  return updatedRule;
}

function buildMatcher(input: CreateRuleInput): VeljaMatcher[] {
  if (!input.matcherPattern.trim()) {
    return [];
  }

  return [
    {
      id: toVeljaUuid(),
      kind: input.matcherKind,
      pattern: input.matcherPattern.trim(),
      fixture: input.matcherFixture.trim(),
    },
  ];
}

export function createRule(input: CreateRuleInput): VeljaRule {
  const newRule: VeljaRule = {
    id: toVeljaUuid(),
    title: input.title.trim(),
    browser: input.browser,
    isEnabled: true,
    matchers: buildMatcher(input),
    sourceApps: input.sourceApps,
    forceNewWindow: input.forceNewWindow,
    openInBackground: input.openInBackground,
    onlyFromAirdrop: input.onlyFromAirdrop,
    runAfterBuiltinRules: input.runAfterBuiltinRules,
    isTransformScriptEnabled: input.isTransformScriptEnabled,
    transformScript: input.transformScript,
  };

  const rules = listRules();
  writeRules([...rules, newRule]);
  return newRule;
}

export function exportRulesAsJson(): string {
  return JSON.stringify(listRules(), null, 2);
}

function isMatcher(value: unknown): value is VeljaMatcher {
  if (!value || typeof value !== "object") {
    return false;
  }

  const matcher = value as Record<string, unknown>;
  return (
    typeof matcher.id === "string" &&
    typeof matcher.kind === "string" &&
    typeof matcher.pattern === "string" &&
    typeof matcher.fixture === "string"
  );
}

function isRule(value: unknown): value is VeljaRule {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rule = value as Record<string, unknown>;
  return (
    typeof rule.id === "string" &&
    typeof rule.title === "string" &&
    typeof rule.browser === "string" &&
    typeof rule.isEnabled === "boolean" &&
    Array.isArray(rule.matchers) &&
    rule.matchers.every((matcher) => isMatcher(matcher)) &&
    Array.isArray(rule.sourceApps) &&
    rule.sourceApps.every((sourceApp) => typeof sourceApp === "string") &&
    typeof rule.forceNewWindow === "boolean" &&
    typeof rule.openInBackground === "boolean" &&
    typeof rule.onlyFromAirdrop === "boolean" &&
    typeof rule.runAfterBuiltinRules === "boolean" &&
    typeof rule.isTransformScriptEnabled === "boolean" &&
    typeof rule.transformScript === "string"
  );
}

export function importRulesFromJson(rulesJson: string): number {
  const parsed = JSON.parse(rulesJson) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Rules JSON must be an array.");
  }

  if (!parsed.every((rule) => isRule(rule))) {
    throw new Error("Rules JSON does not match the Velja rule schema.");
  }

  writeRules(parsed);
  return parsed.length;
}
