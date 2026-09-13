import { highestHealth, isIssue } from "../domain/derive-health";
import type { ProviderCategory, ProviderStatusRecord } from "../domain/types";
import { PROVIDER_CATEGORY_ORDER, PROVIDER_CATEGORY_TITLES } from "./categories";
import type { ProviderDefinition } from "./types";

interface ProviderSection {
  id: string;
  title: string;
  providers: readonly ProviderDefinition[];
}

export function buildProviderSections(
  providers: readonly ProviderDefinition[],
  records: Record<string, ProviderStatusRecord>,
): ProviderSection[] {
  const issues: ProviderDefinition[] = [];
  const maintenance: ProviderDefinition[] = [];
  const unavailable: ProviderDefinition[] = [];
  const categories = new Map<ProviderCategory, ProviderDefinition[]>();

  for (const provider of providers) {
    const record = records[provider.id] ?? unavailableProviderRecord(provider.id);
    if (!record.snapshot || record.freshness === "expired" || record.freshness === "unavailable") {
      unavailable.push(provider);
      continue;
    }

    const activeIncidentHealth = highestHealth(
      record.snapshot.incidents
        .filter((incident) => incident.state !== "resolved")
        .map((incident) => (incident.state === "scheduled" ? "maintenance" : incident.health)),
    );
    const sortableHealth = record.snapshot.health === "unknown" ? activeIncidentHealth : record.snapshot.health;

    if (isIssue(sortableHealth)) {
      issues.push(provider);
    } else if (sortableHealth === "maintenance") {
      maintenance.push(provider);
    } else {
      const category = categories.get(provider.category) ?? [];
      category.push(provider);
      categories.set(provider.category, category);
    }
  }

  const sections: ProviderSection[] = [];
  if (issues.length > 0) sections.push({ id: "issues", title: "Issues", providers: issues });
  if (maintenance.length > 0) sections.push({ id: "maintenance", title: "Maintenance", providers: maintenance });

  for (const category of PROVIDER_CATEGORY_ORDER) {
    const categoryProviders = categories.get(category);
    if (categoryProviders?.length) {
      sections.push({ id: category, title: PROVIDER_CATEGORY_TITLES[category], providers: categoryProviders });
    }
  }

  if (unavailable.length > 0) sections.push({ id: "unavailable", title: "Unavailable", providers: unavailable });
  return sections;
}

export function unavailableProviderRecord(providerId: string): ProviderStatusRecord {
  return {
    providerId,
    freshness: "unavailable",
    refreshState: "idle",
  };
}
