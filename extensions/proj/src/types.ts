import type { Project } from "./utils";
import type { ProjectIDE } from "./settings";

export interface AutoCriteria {
  kind: "recent" | "stale" | "git-org" | "uncategorized";
  days?: number;
  orgName?: string;
}

export interface Collection {
  id: string;
  name: string;
  type: "auto" | "manual";
  icon?: string;
  color?: string;
  criteria?: AutoCriteria;
}

export interface SourceDirectory {
  id: string;
  path: string;
  depth: number;
  defaultCollection?: string;
  defaultIde?: ProjectIDE;
}

export interface ManualProject {
  id: string;
  path: string;
  addedAt: number;
  defaultIde?: ProjectIDE;
  defaultCollection?: string;
}

export interface EnhancedProject extends Project {
  collections: string[];
  lastOpened?: number;
  sourceId?: string;
  detectedLang?: string;
  gitOrg?: string;
  missing?: boolean;
}

export const AUTO_COLLECTIONS: Collection[] = [
  {
    id: "_recent",
    name: "Recent",
    type: "auto",
    icon: "Clock",
    criteria: { kind: "recent", days: 7 },
  },
  {
    id: "_month",
    name: "This Month",
    type: "auto",
    icon: "Calendar",
    criteria: { kind: "recent", days: 30 },
  },
  {
    id: "_stale",
    name: "Stale",
    type: "auto",
    icon: "ExclamationMark",
    criteria: { kind: "stale", days: 90 },
  },
  {
    id: "_uncategorized",
    name: "Uncategorized",
    type: "auto",
    icon: "QuestionMark",
    criteria: { kind: "uncategorized" },
  },
];
