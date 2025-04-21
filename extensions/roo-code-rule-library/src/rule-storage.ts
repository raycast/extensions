import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "./utils/utils";
import { Rule } from "./types";
import * as fs from "fs/promises";
import * as path from "path";
import { ensureStorageDirectoryExists } from "./utils/storage-utils";

interface Preferences {
  storageDirectory: string;
}

const getRulesFilePath = (): string => {
  const preferences = getPreferenceValues<Preferences>();
  const storageDirectory = preferences.storageDirectory;
  const expandedStorageDirectory = storageDirectory.replace(/^~/, process.env.HOME || "");
  return path.join(expandedStorageDirectory, "rules.json");
};

export const fetchRulesFromStorage = async (): Promise<Rule[]> => {
  const rulesFilePath = getRulesFilePath();
  try {
    await ensureStorageDirectoryExists();
    const rulesJson = await fs.readFile(rulesFilePath, "utf-8");
    const rules: Rule[] = rulesJson ? JSON.parse(rulesJson) : [];
    const initializedRules = rules.map((rule) => ({ ...rule, isPinned: rule.isPinned ?? false }));
    return initializedRules;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    showFailureToast("Failed to load rules", error);
    return [];
  }
};

export const saveRulesToStorage = async (rules: Rule[]): Promise<void> => {
  const rulesFilePath = getRulesFilePath();
  try {
    await ensureStorageDirectoryExists();
    await fs.writeFile(rulesFilePath, JSON.stringify(rules, null, 2), "utf-8");
  } catch (error) {
    showFailureToast("Failed to save rules", error);
  }
};

export const deleteRuleFromStorage = async (ruleToDelete: Rule): Promise<Rule[]> => {
  try {
    const existingRules = await fetchRulesFromStorage();
    const updatedRules = existingRules.filter(
      (rule) => !(rule.ruleIdentifier === ruleToDelete.ruleIdentifier && rule.modeSlug === ruleToDelete.modeSlug),
    );
    await saveRulesToStorage(updatedRules);
    showToast({ style: Toast.Style.Success, title: "Rule Deleted" });
    return updatedRules;
  } catch (error) {
    showFailureToast("Failed to delete rule", error);
    throw error;
  }
};

export const toggleRulePinInStorage = async (ruleToToggle: Rule): Promise<Rule[]> => {
  try {
    const existingRules = await fetchRulesFromStorage();
    const updatedRules = existingRules.map((rule) =>
      rule.ruleIdentifier === ruleToToggle.ruleIdentifier && rule.modeSlug === ruleToToggle.modeSlug
        ? { ...rule, isPinned: !rule.isPinned }
        : rule,
    );
    await saveRulesToStorage(updatedRules);
    showToast({ style: Toast.Style.Success, title: ruleToToggle.isPinned ? "Rule Unpinned" : "Rule Pinned" });
    return updatedRules;
  } catch (error) {
    showFailureToast("Failed to toggle rule pin", error);
    throw error;
  }
};

export const addRuleToStorage = async (newRule: Rule): Promise<Rule | undefined> => {
  try {
    const existingRules = await fetchRulesFromStorage();
    const ruleExists = existingRules.some(
      (rule) => rule.ruleIdentifier === newRule.ruleIdentifier && rule.modeSlug === newRule.modeSlug,
    );

    if (ruleExists) {
      showFailureToast(
        "Rule with the same identifier and mode already exists.",
        "Please use a different identifier or mode.",
      );
      return undefined;
    }

    const ruleToAdd = { ...newRule, isPinned: false };
    const updatedRules = [...existingRules, ruleToAdd];
    await saveRulesToStorage(updatedRules);
    showToast({ style: Toast.Style.Success, title: "Rule Added" });
    return ruleToAdd;
  } catch (error) {
    showFailureToast("Failed to add rule", error);
    throw error;
  }
};

export const updateRuleInStorage = async (initialRule: Rule, updatedRule: Rule): Promise<Rule | undefined> => {
  try {
    const existingRules = await fetchRulesFromStorage();

    const ruleExists = existingRules.some(
      (rule) =>
        !(rule.ruleIdentifier === initialRule.ruleIdentifier && rule.modeSlug === initialRule.modeSlug) &&
        rule.ruleIdentifier === updatedRule.ruleIdentifier &&
        rule.modeSlug === updatedRule.modeSlug,
    );

    if (ruleExists) {
      showFailureToast(
        "Rule with the updated identifier and mode already exists.",
        "Please use a different identifier or mode.",
      );
      return undefined;
    }

    const filteredRules = existingRules.filter(
      (rule) => !(rule.ruleIdentifier === initialRule.ruleIdentifier && rule.modeSlug === initialRule.modeSlug),
    );

    const ruleToUpdate = { ...updatedRule, isPinned: initialRule.isPinned };
    const updatedRules = [...filteredRules, ruleToUpdate];
    await saveRulesToStorage(updatedRules);
    showToast({ style: Toast.Style.Success, title: "Rule Updated" });
    return ruleToUpdate;
  } catch (error) {
    showFailureToast("Failed to update rule", error);
    throw error;
  }
};
