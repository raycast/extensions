export interface Environment {
  id: string;
  name: string;
  color: Color;
  description?: string;
}

export interface Deployment {
  id: string;
  environmentId: string;
  ref: string; // commit hash or version string
  deployedAt: string; // ISO 8601 date string
  notes?: string;
  deployedBy?: string;
}

// Subset of Raycast Color enum values we support for environment tagging
export type Color =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "magenta"
  | "primaryText"
  | "secondaryText";
