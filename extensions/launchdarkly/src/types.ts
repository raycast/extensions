export interface LDFlagRule {
  variation?: number;
  rollout?: {
    variations: Array<{
      variation: number;
      weight: number;
    }>;
  };
  clauses: Array<{
    attribute: string;
    op: string;
    values: unknown[];
    negate: boolean;
  }>;
}

export interface LDVariation {
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
}

export interface LDFlagEnvironment {
  on: boolean;
  archived: boolean;
  salt: string;
  sel: string;
  lastModified: number;
  version: number;
  targets: LDTarget[];
  rules: LDFlagRule[];
  fallthrough: {
    variation: number;
    rollout?: {
      variations: Array<{
        variation: number;
        weight: number;
      }>;
      bucketBy?: string;
      contextKind?: string;
    };
  };
  offVariation: number;
  prerequisites: LDPrerequisite[];
  variations: LDVariation[];
  _summary?: {
    variations: Record<
      string,
      {
        contextTargets: number;
        isFallthrough?: boolean;
        isOff?: boolean;
        nullRules: number;
        rules: number;
        targets: number;
        rollout?: number;
        bucketBy?: string;
      }
    >;
  };
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

export interface LDFlagsResponse {
  items: LDFlag[];
  totalCount?: number;
}

export interface LEnvironment {
  key: string;
  name?: string;
}

export interface LDProject {
  key: string;
  name?: string;
  environments: LEnvironment[];
}

export interface LDMaintainer {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  _links?: {
    self: {
      href: string;
    };
  };
}

export interface LDMaintainerTeam {
  key?: string;
  name?: string;
}
