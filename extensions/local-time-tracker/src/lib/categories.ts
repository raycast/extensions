import { Icon } from "@raycast/api";
import type { ProjectCategory } from "./types";

export function getCategoryName(categories: ProjectCategory[], categoryId: string): string {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

export function getCategoryIcon(categoryId: string): Icon {
  if (categoryId === "client") return Icon.Building;
  if (categoryId === "internal") return Icon.Hammer;
  return Icon.Folder;
}
