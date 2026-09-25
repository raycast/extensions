import { Icon, LocalStorage } from "@raycast/api";
import { Instance, instanceId, tokenForInstance } from "./instances";
import { Project, ServiceCollections } from "./interfaces";
import { isModernProject } from "./utils";

type Kind = keyof Pick<
  ServiceCollections,
  "applications" | "mariadb" | "mongo" | "mysql" | "postgres" | "redis" | "compose"
>;
// The deploy route is named after the singular kind ("application.deploy"), while the collection
// on an environment/project is keyed by the plural ("applications") - both map from the same Kind.
const KIND_ID_FIELDS: Record<Kind, string> = {
  applications: "applicationId",
  mariadb: "mariadbId",
  mongo: "mongoId",
  mysql: "mysqlId",
  postgres: "postgresId",
  redis: "redisId",
  compose: "composeId",
};
const DEPLOY_TYPES: Record<Kind, string> = {
  applications: "application",
  mariadb: "mariadb",
  mongo: "mongo",
  mysql: "mysql",
  postgres: "postgres",
  redis: "redis",
  compose: "compose",
};
const KIND_ICONS: Record<Kind, string> = {
  applications: Icon.Globe,
  mariadb: "mariadb.svg",
  mongo: "mongo.svg",
  mysql: "mysql.svg",
  postgres: "postgres.svg",
  redis: "redis.svg",
  compose: "circuit-board.svg",
};
// Same fields services.tsx reads per kind when building its own service status accessory.
const STATUS_FIELDS: Record<Kind, string> = {
  applications: "applicationStatus",
  mariadb: "applicationStatus",
  mongo: "applicationStatus",
  mysql: "applicationStatus",
  postgres: "applicationStatus",
  redis: "applicationStatus",
  compose: "composeStatus",
};

export interface Candidate {
  id: string;
  idField: string;
  deployType: string;
  icon: string;
  name: string;
  appName: string;
  status: string;
  /** The instance's stable `instanceId()`, not just its (editable, not-guaranteed-unique) name - use
   * this, not `instanceName`, wherever a candidate needs a unique key. */
  instanceKey: string;
  instanceName: string;
  projectName: string;
  environmentName: string;
  url: string;
  headers: Record<string, string>;
}

function scopesForProject(project: Project): { name: string; services: ServiceCollections }[] {
  if (isModernProject(project)) {
    return project.environments.map((environment) => ({ name: environment.name, services: environment }));
  }
  return [{ name: project.name, services: project }];
}

function candidatesForInstance(instance: Instance, projects: Project[]): Candidate[] {
  const { url, headers } = tokenForInstance(instance);
  const candidates: Candidate[] = [];

  for (const project of projects) {
    for (const scope of scopesForProject(project)) {
      for (const kind of Object.keys(KIND_ID_FIELDS) as Kind[]) {
        for (const service of scope.services[kind]) {
          const raw = service as unknown as Record<string, string>;
          const id = raw[KIND_ID_FIELDS[kind]];
          candidates.push({
            id,
            idField: KIND_ID_FIELDS[kind],
            deployType: DEPLOY_TYPES[kind],
            icon: KIND_ICONS[kind],
            // Dokploy allows saving a service with no name - falls back to appName, then the id,
            // so this is never empty (matches the same fallback used in service-env.tsx and others).
            name: service.name || service.appName || id,
            appName: service.appName ?? "",
            status: raw[STATUS_FIELDS[kind]],
            instanceKey: instanceId(instance),
            instanceName: instance.name,
            projectName: project.name,
            environmentName: scope.name,
            url,
            headers,
          });
        }
      }
    }
  }

  return candidates;
}

export interface FailedInstance {
  name: string;
  error: string;
}

export interface LoadCandidatesResult {
  candidates: Candidate[];
  failedInstances: FailedInstance[];
  hasInstances: boolean;
}

/**
 * Fans out to every configured instance's `project.all`, flattening every application/database/
 * compose service found into one list of `Candidate`s. A rejected instance doesn't drop out of the
 * results silently - it's reported separately in `failedInstances` so callers can tell "this
 * instance has nothing" apart from "this instance couldn't be reached."
 */
export async function loadCandidates(): Promise<LoadCandidatesResult> {
  const raw = await LocalStorage.getItem<string>("instances");
  const instances: Instance[] = raw ? JSON.parse(raw) : [];
  if (instances.length === 0) {
    return { candidates: [], failedInstances: [], hasInstances: false };
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const { url, headers } = tokenForInstance(instance);
      const response = await fetch(url + "project.all", { headers });
      if (!response.ok) throw new Error(`${response.status}`);
      const projects = (await response.json()) as Project[];
      return candidatesForInstance(instance, projects);
    }),
  );

  return {
    candidates: results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
    failedInstances: results.flatMap((result, index) =>
      result.status === "rejected" ? [{ name: instances[index].name, error: `${result.reason}` }] : [],
    ),
    hasInstances: true,
  };
}
