import type { LabelSetting, ShoppingListItem } from "../types";

export interface ItemGroup {
  key: string;
  name: string;
  items: ShoppingListItem[];
}

const NO_LABEL_KEY = "__no_label__";

/**
 * Gruppiert nach Label und sortiert die Gruppen nach `labelSettings.position`.
 * Das ist die vom Nutzer in Mealie festgelegte Ladenlauf-Reihenfolge, nicht
 * alphabetisch. Labels, die nicht in labelSettings stehen, landen hinter den
 * konfigurierten und vor der Gruppe ohne Label.
 */
export function groupItemsByLabel(items: ShoppingListItem[], labelSettings: LabelSetting[]): ItemGroup[] {
  const positions = new Map(labelSettings.map((setting) => [setting.labelId, setting.position]));
  const buckets = new Map<string, ItemGroup>();

  for (const item of items) {
    const key = item.label?.id ?? NO_LABEL_KEY;
    const name = item.label?.name ?? "No Label";
    const bucket = buckets.get(key) ?? { key, name, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  const fallback = labelSettings.length + 1;
  return [...buckets.values()].sort((a, b) => {
    const pa = a.key === NO_LABEL_KEY ? Number.MAX_SAFE_INTEGER : (positions.get(a.key) ?? fallback);
    const pb = b.key === NO_LABEL_KEY ? Number.MAX_SAFE_INTEGER : (positions.get(b.key) ?? fallback);
    return pa - pb || a.name.localeCompare(b.name, "de");
  });
}
