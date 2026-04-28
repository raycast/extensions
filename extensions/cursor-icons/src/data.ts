import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { CursorConcept, CursorIcon, CursorIconData, ViewFilter } from "./types";

let cachedData: CursorIconData | undefined;

export function getIconData(): CursorIconData {
  if (!cachedData) {
    const dataPath = path.join(environment.assetsPath, "icons", "data.json");
    cachedData = JSON.parse(readFileSync(dataPath, "utf8")) as CursorIconData;
  }

  return cachedData;
}

export function getAssetPath(icon: CursorIcon | CursorConcept): string {
  return path.join(environment.assetsPath, icon.asset);
}

export function readIconSvg(icon: CursorIcon): string {
  return readFileSync(getAssetPath(icon), "utf8");
}

export function findIcon(iconName: string, icons: CursorIcon[]): CursorIcon | undefined {
  return icons.find((icon) => icon.name === iconName);
}

export function getIconKeywords(icon: CursorIcon, conceptLabels: string[] = []): string[] {
  return [
    icon.name,
    icon.displayName,
    icon.style,
    ...icon.tags,
    ...conceptLabels,
    icon.name.replaceAll("-", ""),
    icon.displayName.replaceAll(" ", ""),
  ];
}

export function getConceptKeywords(concept: CursorConcept, icon: CursorIcon): string[] {
  return [concept.concept, concept.iconName, icon.displayName, ...icon.tags, ...concept.tags];
}

export function filterIconsByView(icons: CursorIcon[], view: ViewFilter): CursorIcon[] {
  switch (view) {
    case "all":
    case "concepts":
      return icons;
    case "outline":
      return icons.filter((icon) => icon.style === "outline");
    case "filled":
      return icons.filter((icon) => icon.style === "filled");
    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
