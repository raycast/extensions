export interface DomainMapping {
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  url: string;
  description?: string;
  domainMappings: DomainMapping[];
  project?: Project;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  envVars: string[];
  isBlocked?: boolean;
}

export type ProductionLog = Record<string, unknown> & {
  type: "string";
};

export type RelatedCommit = {
  hash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorGithubUsername: string;
  url: string;
};

export type ProductionDeployment<T> = {
  id: string;
  relatedCommit: T;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  deployment: {
    id: string;
    url: string;
    description: string;
    domainMappings: DomainMapping[];
    envVars: string[];
    isBlocked?: boolean;
  };
  logs: ProductionLog[];
};

type WithProductionDeployment<T> = {
  productionDeployment: T;
  hasProductionDeployment: true;
};

type WithoutProductionDeployment = {
  productionDeployment: null;
  hasProductionDeployment: false;
};

type ChooseDeployment<T> = T extends null ? WithoutProductionDeployment : WithProductionDeployment<T>;

export type BaseProject<T> = ChooseDeployment<T> & {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  envVars: string[];
};

export type GitProject = BaseProject<ProductionDeployment<RelatedCommit>> & {
  type: "git";
  git: {
    repository: {
      id: number;
      owner: string;
      name: string;
    };
    entrypoint: string;
    productionBranch: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type PlaygroundProject = BaseProject<ProductionDeployment<null>> & {
  type: "playground";
  playground: {
    snippet: string;
    mediaType: "ts" | "js" | "tsx" | "jsx";
    isPublic: boolean;
    manifest: null | unknown;
    entrypoint: null | unknown;
  };
};

export type Project = GitProject | PlaygroundProject;

export interface DeploymentsSummary {
  page: number;
  count: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface LiveLogReady {
  type: "ready";
}

export interface LiveLogPing {
  type: "ping";
}

export interface LiveLogMessage {
  type: "message";
  time: string;
  message: string;
  level: "debug" | "info" | "warning" | "error";
  region: string;
}

export type LiveLog = LiveLogReady | LiveLogPing | LiveLogMessage;

export interface ProjectCreatePlaygroundRequest {
  organizationId: string;
  playground: {
    snippet: string;
    mediaType: string;
  };
}

export interface LogQueryRequestParams {
  regions?: string[];
  levels?: string[];
  // RFC3339
  since?: string;
  // RFC3339
  until?: string;
  q?: string[];
  limit?: number;
}

export interface PersistedLog {
  deploymentId: string;
  isolateId: string;
  region: string;
  level: "debug" | "info" | "warning" | "error";
  // RFC3339
  timestamp: string;
  message: string;
}

export interface Metadata {
  regionCodes: string[];
}
export interface User {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  githubId: number;
  isBlocked: boolean;
  isAdmin: boolean;
  pro: boolean;
  subscription: {
    plan: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  features: string[];
  updatedAt: string;
  createdAt: string;
}

export type Organization = {
  id: string;
  name: string | null;
  subscription: {
    plan: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  };
  features: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  user: {
    id: string;
    login: string;
    name: string;
    avatarUrl: string;
  };
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationExtended = Organization & {
  projects: Project[];
  members: OrganizationMember[];
};

export type RestDeployment = {
  id: string;
  projectId: string;
  description: string;
  status: "string";
  domains: string[];
  databases: {
    default: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type RestDatabase = {
  id: string;
  organizationId: string;
  description: string;
  updatedAt: string;
  createdAt: string;
};
