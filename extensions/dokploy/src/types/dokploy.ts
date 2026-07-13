/** Status shared by applications and all six database kinds (`applicationStatus` column). */
export type ServiceStatus = "idle" | "running" | "done" | "error";

export type BuildType = "dockerfile" | "heroku_buildpacks" | "paketo_buildpacks" | "nixpacks" | "static" | "railpack";

export type SourceType = "docker" | "git" | "github" | "gitlab" | "bitbucket" | "gitea" | "drop";

/**
 * The eight deployable things Dokploy manages. They share a lifecycle (deploy/start/stop/logs…)
 * but each one has its own id field and route namespace - see `lib/service-kinds.ts`.
 */
export type ServiceKind = "application" | "compose" | "postgres" | "mysql" | "mariadb" | "mongo" | "redis" | "libsql";

/**
 * `project.all` returns *different shapes depending on the caller's role*: owners and admins get
 * full rows, while a scoped user only gets `{ id, name, status }` per service. Everything past the
 * id is therefore optional, and detail views re-fetch through `<kind>.one`.
 */
export interface NestedService {
  name?: string;
  appName?: string;
  applicationStatus?: ServiceStatus;
  composeStatus?: ServiceStatus;
  description?: string | null;
  [key: string]: unknown;
}

/**
 * The keys services live under inside an environment.
 *
 * Note `applications` - it is the only plural one. The other seven match their route namespace
 * exactly, which makes it very easy to assume all eight do. They don't.
 */
export type EnvironmentServiceKey =
  "applications" | "compose" | "postgres" | "mysql" | "mariadb" | "mongo" | "redis" | "libsql";

export type Environment = {
  environmentId: string;
  name: string;
  isDefault?: boolean;
  description?: string | null;
  projectId?: string;
} & Partial<Record<EnvironmentServiceKey, NestedService[]>>;

export interface Project {
  projectId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  organizationId?: string;
  env?: string;
  environments?: Environment[];
  projectTags?: { tagId?: string; name?: string }[];
}

/** A service flattened out of the project tree, carrying enough context to act on it. */
export interface ServiceRef {
  kind: ServiceKind;
  id: string;
  name: string;
  status?: ServiceStatus;
  /** Docker/Swarm name. Required by the `reload` routes, so detail views fetch it when missing. */
  appName?: string;
  description?: string | null;
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
}

export interface Application extends NestedService {
  applicationId: string;
  name: string;
  appName: string;
  applicationStatus: ServiceStatus;
  buildType?: BuildType;
  sourceType?: SourceType;
  repository?: string | null;
  owner?: string | null;
  branch?: string | null;
  dockerImage?: string | null;
  env?: string | null;
  replicas?: number;
  autoDeploy?: boolean | null;
  environmentId?: string;
  serverId?: string | null;
  createdAt?: string;
}

export interface Compose extends NestedService {
  composeId: string;
  name: string;
  appName: string;
  composeStatus: ServiceStatus;
  composeType?: string;
  sourceType?: string;
  repository?: string | null;
  branch?: string | null;
  composePath?: string;
  env?: string | null;
  environmentId?: string;
  serverId?: string | null;
  createdAt?: string;
}

export interface Domain {
  domainId: string;
  host: string;
  path?: string | null;
  port?: number | null;
  https?: boolean;
  domainType?: string | null;
  serviceName?: string | null;
}

/** Deployments have their own status enum - note `cancelled`, which services never have. */
export type DeploymentStatus = "running" | "done" | "error" | "cancelled";

export interface Deployment {
  deploymentId: string;
  title?: string;
  description?: string | null;
  status?: DeploymentStatus;
  logPath?: string;
  /** Set while a build is running; this is the process the kill route targets. */
  pid?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
  errorMessage?: string | null;
  /** Present when this deployment produced a rollback point that can be restored. */
  rollbackId?: string | null;
  isPreviewDeployment?: boolean | null;
}

/** The project/environment a service belongs to, as `deployment.allCentralized` nests it. */
interface DeploymentServiceOwner {
  name?: string;
  appName?: string;
  environment?: {
    environmentId?: string;
    name?: string;
    project?: { projectId?: string; name?: string };
  } | null;
}

/**
 * `deployment.allCentralized` returns every deployment on the instance in a single call, each with
 * its owning application or compose stack - and through that its environment and project - nested
 * inside. That is what makes a menu-bar deployments feed affordable: one request, not one per
 * service.
 */
export interface CentralizedDeployment extends Deployment {
  applicationId?: string | null;
  composeId?: string | null;
  application?: (DeploymentServiceOwner & { applicationId?: string }) | null;
  compose?: (DeploymentServiceOwner & { composeId?: string }) | null;
}

export interface Server {
  serverId: string;
  name: string;
  description?: string | null;
  ipAddress?: string;
  port?: number;
  username?: string;
  serverStatus?: string;
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt?: string;
}

export interface SessionUser {
  id?: string;
  name?: string | null;
  email?: string;
  role?: string;
  [key: string]: unknown;
}
