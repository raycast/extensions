import data from "./registry.json";

export interface RegistryItem {
  id: string;
  kind: "url" | "command";
  url?: string;
  label: string;
  icon: string;
  keywords: string[];
  group: string;
  shortcut?: string | null;
  parent?: string | null;
  shortLabel?: string | null;
  module?: string | null;
  dynamicUrl?: boolean;
}

export interface EntityType {
  key: string;
  label: string;
  icon: string;
  aliases: string[];
}

export interface MenuItem {
  id: string;
  label: string;
  subtitle?: string | null;
  icon: string;
  url: string;
  secondaryUrl?: string | null;
  shortcut?: string | null;
  dynamicUrl?: boolean;
}

export const GROUPS: { key: string; title: string }[] = [
  { key: "navigation", title: "Navigation" },
  { key: "settings", title: "Einstellungen" },
  { key: "actions", title: "Aktionen" },
];

export const REGISTRY_ITEMS = (data.items as RegistryItem[]).filter((item) => item.kind === "url" && item.url);

export const ENTITY_TYPES = data.entityTypes as EntityType[];

/** Restricts the query to one entity type when it starts with an alias prefix like `R:`. */
export function matchScopePrefix(
  entityTypes: EntityType[],
  query: string,
): { entityType: EntityType; rest: string } | null {
  const match = /^([^\s:]+):\s*(.*)$/s.exec(query);
  if (!match) {
    return null;
  }
  const prefix = match[1].toUpperCase();
  const entityType = entityTypes.find((type) => type.aliases.includes(prefix));
  return entityType ? { entityType, rest: match[2] } : null;
}

/** Converts a registry entry into a menu item. */
export function registryToMenuItem(item: RegistryItem, subtitle?: string | null): MenuItem {
  return {
    id: item.id,
    label: item.label,
    subtitle,
    icon: item.icon,
    url: item.url ?? "",
    shortcut: item.shortcut,
    dynamicUrl: item.dynamicUrl,
  };
}
