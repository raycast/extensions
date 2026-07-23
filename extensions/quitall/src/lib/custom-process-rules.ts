import { LocalStorage } from "@raycast/api";
import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname } from "node:path";
import {
  isProtectedProcessPath,
  normalizeCustomProcessRules,
  removeCustomProcessRuleFromList,
  resolveCustomPathInput,
  upsertCustomProcessRuleInList,
} from "./custom-process-rule-logic";
import type { CustomProcessRule } from "../types";

const STORAGE_KEY = "custom-process-rules-v1";

export async function loadCustomProcessRules(): Promise<CustomProcessRule[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (stored === undefined) {
    return [];
  }

  try {
    return normalizeCustomProcessRules(JSON.parse(stored));
  } catch {
    return [];
  }
}

export async function createCustomProcessRule(input: {
  forceAfterTimeout: boolean;
  name?: string;
  path: string;
}): Promise<CustomProcessRule> {
  const absolutePath = resolveCustomPathInput(input.path, homedir());
  const canonicalPath = await realpath(absolutePath);
  const fileStat = await stat(canonicalPath);
  const isApplicationBundle =
    fileStat.isDirectory() && extname(canonicalPath).toLowerCase() === ".app";

  if (fileStat.isDirectory() && !isApplicationBundle) {
    throw new Error("Choose an application bundle or an executable file");
  }

  if (!fileStat.isDirectory() && (fileStat.mode & 0o111) === 0) {
    throw new Error("The selected file is not executable");
  }

  if (isProtectedProcessPath(canonicalPath)) {
    throw new Error("Raycast cannot be added as a termination target");
  }

  const fallbackName = basename(canonicalPath, isApplicationBundle ? extname(canonicalPath) : "");
  const name = input.name?.trim() || fallbackName;

  return {
    forceAfterTimeout: input.forceAfterTimeout,
    name,
    path: canonicalPath,
  };
}

export async function upsertCustomProcessRule(
  rule: CustomProcessRule,
): Promise<CustomProcessRule[]> {
  const rules = await loadCustomProcessRules();
  const updatedRules = upsertCustomProcessRuleInList(rules, rule);
  await saveCustomProcessRules(updatedRules);
  return updatedRules;
}

export async function removeCustomProcessRule(path: string): Promise<CustomProcessRule[]> {
  const rules = await loadCustomProcessRules();
  const updatedRules = removeCustomProcessRuleFromList(rules, path);
  await saveCustomProcessRules(updatedRules);
  return updatedRules;
}

export async function setCustomProcessRuleForceBehavior(
  path: string,
  forceAfterTimeout: boolean,
): Promise<CustomProcessRule[]> {
  const rules = await loadCustomProcessRules();
  const existingRule = rules.find((rule) => rule.path === path);

  if (!existingRule) {
    return rules;
  }

  const updatedRules = upsertCustomProcessRuleInList(rules, {
    ...existingRule,
    forceAfterTimeout,
  });
  await saveCustomProcessRules(updatedRules);
  return updatedRules;
}

export { isProtectedProcessPath } from "./custom-process-rule-logic";

async function saveCustomProcessRules(rules: CustomProcessRule[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCustomProcessRules(rules)));
}
