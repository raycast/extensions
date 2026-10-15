import { categoryTitle, t } from "../i18n.ts";
import type { Catalog, Conflict, EntityValue, Location } from "../model.ts";

export function isCatalog(value: EntityValue): value is Catalog {
  return (value as Catalog).groups !== undefined;
}

export function locationLabel(catalog: Catalog, location: Location): string {
  const group = catalog.groups.find((g) => g.id === location.groupId);
  const sub = group?.children.find((s) => s.id === location.subGroupId);
  return `${group ? categoryTitle(group.id, group.name) : location.groupId} › ${sub ? categoryTitle(sub.id, sub.name) : location.subGroupId}`;
}

export function conflictTitle(conflict: Conflict): string {
  const value = conflict.candidates[0]?.value;
  if (value && !isCatalog(value)) return value.title || t`书签 ${value.id}`;
  return t("分类表（Catalog）");
}
