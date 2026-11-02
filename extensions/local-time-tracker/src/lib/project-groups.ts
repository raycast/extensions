import { Icon } from "@raycast/api";
import type { ProjectCategory } from "./types";

export function getProjectGroupName(categories: ProjectCategory[], categoryId: string): string {
  return categories.find((category) => category.id === categoryId)?.name ?? "Ungrouped";
}

export const CATEGORY_ICONS = Object.entries(Icon).map(([name, icon]) => ({ name, icon }));

export function getProjectGroupIconName(categories: ProjectCategory[], categoryId: string): string {
  const savedIcon = categories.find((category) => category.id === categoryId)?.icon;
  if (savedIcon && Object.prototype.hasOwnProperty.call(Icon, savedIcon)) return savedIcon;
  return "Folder";
}

export function getProjectGroupIcon(categories: ProjectCategory[], categoryId: string): Icon {
  return Icon[getProjectGroupIconName(categories, categoryId) as keyof typeof Icon];
}
