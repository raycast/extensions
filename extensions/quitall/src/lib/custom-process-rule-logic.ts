import { isAbsolute, join } from "node:path";
import type { CustomProcessRule } from "../types.ts";

export function resolveCustomPathInput(input: string, homeDirectory: string): string {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Choose a file or enter a custom path");
  }

  const expandedPath =
    trimmedInput === "~"
      ? homeDirectory
      : trimmedInput.startsWith("~/")
        ? join(homeDirectory, trimmedInput.slice(2))
        : trimmedInput;

  if (!isAbsolute(expandedPath)) {
    throw new Error("Enter an absolute path or a path beginning with ~/");
  }

  return expandedPath;
}

export function normalizeCustomProcessRules(value: unknown): CustomProcessRule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rulesByPath = new Map<string, CustomProcessRule>();

  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.path !== "string" ||
      item.path.length === 0 ||
      typeof item.name !== "string" ||
      item.name.length === 0 ||
      typeof item.forceAfterTimeout !== "boolean"
    ) {
      continue;
    }

    rulesByPath.set(item.path, {
      forceAfterTimeout: item.forceAfterTimeout,
      name: item.name,
      path: item.path,
    });
  }

  return [...rulesByPath.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

export function upsertCustomProcessRuleInList(
  rules: CustomProcessRule[],
  rule: CustomProcessRule,
): CustomProcessRule[] {
  return normalizeCustomProcessRules([...rules.filter((existingRule) => existingRule.path !== rule.path), rule]);
}

export function removeCustomProcessRuleFromList(rules: CustomProcessRule[], path: string): CustomProcessRule[] {
  return rules.filter((rule) => rule.path !== path);
}

export function isProtectedProcessPath(path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return normalizedPath.endsWith("/raycast.app") || normalizedPath.includes("/raycast.app/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
