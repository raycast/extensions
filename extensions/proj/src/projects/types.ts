// src/projects/types.ts
import type { EnhancedProject } from "../types";
import type { ProjectSettings } from "../settings";
import { Icon } from "@raycast/api";

export interface Preferences {
  ide: { path: string; name: string };
  showStaleIndicator: boolean;
}

export interface ProjectWithSettings extends EnhancedProject {
  settings: ProjectSettings;
  missing: boolean;
  hasInvalidIde?: boolean;
}

export type GroupingMode = "collection" | "recency" | "flat";

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  icon: Icon;
  filter: string;
}

export interface GroupedSection {
  title: string;
  projects: ProjectWithSettings[];
  isAuto: boolean;
  collectionIcon?: string;
  collectionColor?: string;
}

export type Accessory = {
  icon?: { source: Icon; tintColor?: string };
  text?: string;
  tooltip?: string;
};
