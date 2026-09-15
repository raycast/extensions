export interface LDClause {
  attribute: string;
  op: string;
  values: unknown[];
  negate: boolean;
  contextKind?: string;
}

export interface LDRolloutVariation {
  variation: number;
  weight: number;
}

export interface LDRollout {
  variations: LDRolloutVariation[];
  bucketBy?: string;
  contextKind?: string;
}

export interface LDFlagRule {
  _id?: string;
  description?: string;
  variation?: number;
  rollout?: LDRollout | null;
  clauses: LDClause[];
}

export interface LDVariation {
  _id?: string;
  value: unknown;
  name?: string;
  description?: string;
}

export interface LDPrerequisite {
  key: string;
  variation: number;
}

export interface LDTarget {
  values: string[];
  variation: number;
  contextKind?: string;
}

export interface LDFlagEnvironment {
  _environmentName?: string;
  on: boolean;
  archived?: boolean;
  lastModified?: number;
  version?: number;
  targets?: LDTarget[];
  contextTargets?: LDTarget[];
  rules?: LDFlagRule[];
  fallthrough?: {
    variation?: number;
    rollout?: LDRollout;
  };
  offVariation?: number;
  prerequisites?: LDPrerequisite[];
}

export interface LDMaintainer {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface LDMaintainerTeam {
  key?: string;
  name?: string;
}

export interface LDFlag {
  key: string;
  name: string;
  description?: string;
  variations: LDVariation[];
  environments?: Record<string, LDFlagEnvironment>;
  archived?: boolean;
  deprecated?: boolean;
  temporary?: boolean;
  kind?: string;
  creationDate?: number;
  tags?: string[];
  _maintainer?: LDMaintainer;
  _maintainerTeam?: LDMaintainerTeam;
  defaults?: {
    onVariation?: number;
    offVariation?: number;
  };
  version?: number;
}

export interface LDLinks {
  self?: { href: string };
  next?: { href: string };
  prev?: { href: string };
}

export interface LDPaginated<T> {
  items: T[];
  totalCount?: number;
  _links?: LDLinks;
}

export type LDFlagsResponse = LDPaginated<LDFlag>;

export interface LDProject {
  _id?: string;
  key: string;
  name: string;
  tags?: string[];
}

export interface LDEnvironment {
  _id?: string;
  key: string;
  name: string;
  /** Hex color without the leading `#`, e.g. "417505". */
  color?: string;
  critical?: boolean;
  tags?: string[];
}

export type LDFlagStatusName = "new" | "active" | "inactive" | "launched";

export interface LDFlagEnvironmentStatus {
  name: LDFlagStatusName;
  lastRequested?: string;
  default?: unknown;
}

export interface LDFlagStatusResponse {
  key?: string;
  environments: Record<string, LDFlagEnvironmentStatus>;
}

export interface LDSegment {
  key: string;
  name: string;
  description?: string;
}

export interface LDMember {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface LDAuditLogEntry {
  _id: string;
  date: number;
  kind?: string;
  name?: string;
  title?: string;
  titleVerb?: string;
  description?: string;
  shortDescription?: string;
  comment?: string;
  member?: LDMember;
  token?: { _id?: string; name?: string };
  target?: {
    name?: string;
    resources?: string[];
  };
  parent?: {
    name?: string;
    resource?: string;
  };
}

export interface LDAuditLogResponse {
  items: LDAuditLogEntry[];
  _links?: LDLinks;
}

/** Flag reference persisted locally for favorites and recents. */
export interface StoredFlagRef {
  projectKey: string;
  key: string;
  name: string;
  visitedAt?: number;
}
