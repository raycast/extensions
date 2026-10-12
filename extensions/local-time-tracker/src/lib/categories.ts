import { Icon } from "@raycast/api";
import type { ProjectCategory } from "./types";

export function getCategoryName(categories: ProjectCategory[], categoryId: string): string {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

export const CATEGORY_ICONS = Object.entries(Icon).map(([name, icon]) => ({ name, icon }));

export function getCategoryIconName(categories: ProjectCategory[], categoryId: string): string {
  const savedIcon = categories.find((category) => category.id === categoryId)?.icon;
  if (savedIcon && Object.prototype.hasOwnProperty.call(Icon, savedIcon)) return savedIcon;
  if (categoryId === "client") return "Building";
  if (categoryId === "internal") return "Hammer";
  return "Folder";
}

export function getCategoryIcon(categories: ProjectCategory[], categoryId: string): Icon {
  return Icon[getCategoryIconName(categories, categoryId) as keyof typeof Icon];
}
