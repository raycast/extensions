import { LocalStorage } from "@raycast/api";
import type { SpecGridItem } from "../types";

const STORAGE_KEY = "spec-usage";

export async function getSpecUsage(): Promise<Record<string, number>> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function incrementSpecUsage(specSlug: string): Promise<void> {
  const usage = await getSpecUsage();
  usage[specSlug] = (usage[specSlug] ?? 0) + 1;
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function sortSpecsByUsage(
  items: SpecGridItem[],
  usage: Record<string, number>,
): SpecGridItem[] {
  return [...items].sort(
    (a, b) => (usage[b.spec.slug] ?? 0) - (usage[a.spec.slug] ?? 0),
  );
}

export function getRoleBadge(pveRole: string): string {
  if (pveRole === "tank") return "🛡 Tank";
  if (pveRole === "healer") return "💚 Healer";
  return "⚔ DPS";
}
