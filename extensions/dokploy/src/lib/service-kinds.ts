import { Color, Icon } from "@raycast/api";
import { EnvironmentServiceKey, ServiceKind } from "../types/dokploy";

/**
 * Every lifecycle action Dokploy exposes for a service. Not every kind supports every action:
 * applications and compose stacks `redeploy`, databases `rebuild`; compose stacks have no
 * `reload` route at all. A missing entry in `routes` means "this kind can't do that".
 */
export type ServiceAction = "deploy" | "redeploy" | "rebuild" | "start" | "stop" | "reload" | "remove";

export interface ServiceKindConfig {
  kind: ServiceKind;
  /** The API route namespace, e.g. `application` in `application.deploy`. */
  namespace: string;
  /**
   * The key this kind lives under inside an environment in the `project.all` tree.
   *
   * Usually identical to `namespace` - but NOT for applications, which are under `applications`.
   * Conflating the two silently dropped every application from the UI, so they are separate fields
   * and the type forbids a key that isn't real.
   */
  environmentKey: EnvironmentServiceKey;
  /** Human label, singular. */
  label: string;
  /** Plural label, for section headers. */
  pluralLabel: string;
  /** The primary-key field Dokploy expects in bodies and query strings, e.g. `applicationId`. */
  idField: string;
  /** Which field on the raw row carries the status - compose is the odd one out. */
  statusField: "applicationStatus" | "composeStatus";
  icon: Icon;
  color: Color;
  /** Whether this kind is a database (drives grouping and a couple of UI affordances). */
  isDatabase: boolean;
  /**
   * Only applications and compose stacks keep a build history. Confirmed by `deployment.allByType`,
   * whose `type` enum covers application/compose/server/schedule/preview/backup - but no databases.
   */
  hasDeployments: boolean;
  /** Action name -> route suffix. `reload` additionally requires `appName` in the body. */
  routes: Partial<Record<ServiceAction, string>>;
}

const DATABASE_ROUTES: Partial<Record<ServiceAction, string>> = {
  deploy: "deploy",
  rebuild: "rebuild",
  start: "start",
  stop: "stop",
  reload: "reload",
  remove: "remove",
};

export const SERVICE_KINDS: Record<ServiceKind, ServiceKindConfig> = {
  application: {
    kind: "application",
    namespace: "application",
    environmentKey: "applications",
    label: "Application",
    pluralLabel: "Applications",
    idField: "applicationId",
    statusField: "applicationStatus",
    icon: Icon.AppWindow,
    color: Color.Blue,
    isDatabase: false,
    hasDeployments: true,
    routes: {
      deploy: "deploy",
      redeploy: "redeploy",
      start: "start",
      stop: "stop",
      reload: "reload",
      remove: "delete",
    },
  },
  compose: {
    kind: "compose",
    namespace: "compose",
    environmentKey: "compose",
    label: "Compose",
    pluralLabel: "Compose Stacks",
    idField: "composeId",
    statusField: "composeStatus",
    icon: Icon.Box,
    color: Color.Purple,
    isDatabase: false,
    hasDeployments: true,
    routes: {
      deploy: "deploy",
      redeploy: "redeploy",
      start: "start",
      stop: "stop",
      remove: "delete",
    },
  },
  postgres: {
    kind: "postgres",
    namespace: "postgres",
    environmentKey: "postgres",
    label: "PostgreSQL",
    pluralLabel: "PostgreSQL",
    idField: "postgresId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Blue,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
  mysql: {
    kind: "mysql",
    namespace: "mysql",
    environmentKey: "mysql",
    label: "MySQL",
    pluralLabel: "MySQL",
    idField: "mysqlId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Orange,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
  mariadb: {
    kind: "mariadb",
    namespace: "mariadb",
    environmentKey: "mariadb",
    label: "MariaDB",
    pluralLabel: "MariaDB",
    idField: "mariadbId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Magenta,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
  mongo: {
    kind: "mongo",
    namespace: "mongo",
    environmentKey: "mongo",
    label: "MongoDB",
    pluralLabel: "MongoDB",
    idField: "mongoId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Green,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
  redis: {
    kind: "redis",
    namespace: "redis",
    environmentKey: "redis",
    label: "Redis",
    pluralLabel: "Redis",
    idField: "redisId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Red,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
  libsql: {
    kind: "libsql",
    namespace: "libsql",
    environmentKey: "libsql",
    label: "LibSQL",
    pluralLabel: "LibSQL",
    idField: "libsqlId",
    statusField: "applicationStatus",
    icon: Icon.HardDrive,
    color: Color.Yellow,
    isDatabase: true,
    hasDeployments: false,
    routes: DATABASE_ROUTES,
  },
};

export const SERVICE_KIND_LIST = Object.values(SERVICE_KINDS);

export function serviceKindConfig(kind: ServiceKind): ServiceKindConfig {
  return SERVICE_KINDS[kind];
}

export function supportsAction(kind: ServiceKind, action: ServiceAction): boolean {
  return SERVICE_KINDS[kind].routes[action] !== undefined;
}

/** Applications and compose stacks have a build history; databases don't. */
export function hasDeployments(kind: ServiceKind): boolean {
  return SERVICE_KINDS[kind].hasDeployments;
}

/** The label shown on the action, e.g. databases "Rebuild" where applications "Redeploy". */
export const ACTION_LABELS: Record<ServiceAction, string> = {
  deploy: "Deploy",
  redeploy: "Redeploy",
  rebuild: "Rebuild",
  start: "Start",
  stop: "Stop",
  reload: "Reload",
  remove: "Delete",
};

/**
 * Past tense, for success messages. Spelled out rather than derived, because appending "ed" to the
 * labels gives "Stoped" and "Rebuilded".
 */
export const ACTION_PAST: Record<ServiceAction, string> = {
  deploy: "Deployed",
  redeploy: "Redeployed",
  rebuild: "Rebuilt",
  start: "Started",
  stop: "Stopped",
  reload: "Reloaded",
  remove: "Deleted",
};

/** Present participle, for in-flight messages: "Deploying api…". */
export const ACTION_PROGRESS: Record<ServiceAction, string> = {
  deploy: "Deploying",
  redeploy: "Redeploying",
  rebuild: "Rebuilding",
  start: "Starting",
  stop: "Stopping",
  reload: "Reloading",
  remove: "Deleting",
};

/** Actions that change running state and therefore deserve a confirmation prompt. */
export const DESTRUCTIVE_ACTIONS: ServiceAction[] = ["stop", "remove"];
