import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "exclusionRulesByDb";

export type ExclusionRuleType = "regex" | "contains" | "not_contains";

export type ExclusionRule = {
  id: string;
  type: ExclusionRuleType;
  pattern: string;
};

function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type StoredExclusionRules = Record<string, ExclusionRule[]>;

async function readAll(): Promise<StoredExclusionRules> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as StoredExclusionRules;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(data: StoredExclusionRules): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getExclusionRules(dbId: string): Promise<ExclusionRule[]> {
  const data = await readAll();
  const rules = data[dbId];
  return Array.isArray(rules) ? rules : [];
}

export async function addExclusionRule(dbId: string, type: ExclusionRuleType, pattern: string): Promise<ExclusionRule> {
  const data = await readAll();
  const rules = data[dbId] ?? [];
  const rule: ExclusionRule = { id: generateId(), type, pattern };
  rules.push(rule);
  data[dbId] = rules;
  await writeAll(data);
  return rule;
}

export async function removeExclusionRule(dbId: string, ruleId: string): Promise<void> {
  const data = await readAll();
  const rules = (data[dbId] ?? []).filter((r) => r.id !== ruleId);
  data[dbId] = rules;
  await writeAll(data);
}

/** Used by migration to assign legacy rules to a database. */
export async function setExclusionRulesForDb(dbId: string, rules: ExclusionRule[]): Promise<void> {
  const data = await readAll();
  data[dbId] = rules;
  await writeAll(data);
}

export function isTableExcluded(tableKey: string, rules: ExclusionRule[]): boolean {
  for (const rule of rules) {
    switch (rule.type) {
      case "regex": {
        try {
          if (new RegExp(rule.pattern).test(tableKey)) return true;
        } catch {
          // invalid regex, skip
        }
        break;
      }
      case "contains":
        if (tableKey.includes(rule.pattern)) return true;
        break;
      case "not_contains":
        if (!tableKey.includes(rule.pattern)) return true;
        break;
    }
  }
  return false;
}

export function filterTables<T extends { key: string }>(items: T[], rules: ExclusionRule[]): T[] {
  if (rules.length === 0) return items;
  return items.filter((item) => !isTableExcluded(item.key, rules));
}

export function ruleDescription(rule: ExclusionRule): string {
  switch (rule.type) {
    case "regex":
      return `Regex: ${rule.pattern}`;
    case "contains":
      return `Contains: ${rule.pattern}`;
    case "not_contains":
      return `Does not contain: ${rule.pattern}`;
    default:
      return `Unknown rule type: ${rule.type}`;
  }
}
