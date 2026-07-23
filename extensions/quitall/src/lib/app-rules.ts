import { LocalStorage } from "@raycast/api";
import { DEFAULT_RULES, isProtectedBundleId, normalizeRules } from "./app-rule-logic";
import type { AppRule, AppRulesState } from "../types";

const STORAGE_KEY = "app-rules-v1";

export {
  createQuitPlan,
  getAppRule,
  isProtectedBundleId,
  keepStillRunning,
} from "./app-rule-logic";

export async function loadAppRules(): Promise<AppRulesState> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (stored === undefined) {
    const initial = structuredClone(DEFAULT_RULES);
    await saveAppRules(initial);
    return initial;
  }

  try {
    return normalizeRules(JSON.parse(stored));
  } catch {
    return structuredClone(DEFAULT_RULES);
  }
}

export async function saveAppRules(state: AppRulesState): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeRules(state)));
}

export async function setAppRule(bundleId: string, rule: AppRule): Promise<AppRulesState> {
  const state = await loadAppRules();

  if (isProtectedBundleId(bundleId)) {
    return state;
  }

  if (rule === "default") {
    delete state.rules[bundleId];
  } else {
    state.rules[bundleId] = rule;
  }

  await saveAppRules(state);
  return state;
}
