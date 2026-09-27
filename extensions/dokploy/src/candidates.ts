import { Icon, LocalStorage } from "@raycast/api";
import { Instance, instanceId, tokenForInstance } from "./instances";
import { Project, ServiceCollections } from "./interfaces";
import { isModernProject } from "./utils";

type Kind = keyof Pick<
  ServiceCollections,
  "applications" | "mariadb" | "mongo" | "mysql" | "postgres" | "redis" | "compose"
>;
/** `Candidate.deployType`'s own value space - the singular route-name form, not `Kind`'s plural
 * collection-key form. Shared with the AI tools, which filter/report on this. */
export type DeployType = "application" | "mariadb" | "mongo" | "mysql" | "postgres" | "redis" | "compose";
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
const DEPLOY_TYPES: Record<Kind, DeployType> = {
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
  deployType: DeployType;
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

export interface CandidateFilter {
  /** Matched case-insensitively against an instance's name. */
  instance?: string;
  /** Matched case-insensitively against a project's name. */
  project?: string;
  kind?: DeployType;
}

export function matchesFilter(candidate: Candidate, filter: CandidateFilter): boolean {
  if (filter.instance && !candidate.instanceName.toLowerCase().includes(filter.instance.toLowerCase())) return false;
  if (filter.project && !candidate.projectName.toLowerCase().includes(filter.project.toLowerCase())) return false;
  if (filter.kind && candidate.deployType !== filter.kind) return false;
  return true;
}

/**
 * Finds the one candidate a name/id refers to - for AI tools that act on "the service named X".
 * Throws a clear, model-readable error (rather than silently guessing) when nothing matches, when
 * the name is ambiguous across projects/instances, or when an unreachable instance might be hiding
 * the real match.
 */
export async function resolveCandidate(nameOrId: string, filter: CandidateFilter = {}): Promise<Candidate> {
  const { candidates, failedInstances, hasInstances } = await loadCandidates();
  if (!hasInstances) throw new Error("No Dokploy instances are configured in this extension yet - add one first.");

  // Failures unrelated to this lookup shouldn't block it - narrow to instances the current
  // `instance` filter doesn't already rule out. A `project`/`kind` filter can't rule one out this
  // way: an unreached instance's projects/kinds are unknown, so it could still hold a same-named
  // service under either.
  const relevantFailures = filter.instance
    ? failedInstances.filter((failed) => failed.name.toLowerCase().includes(filter.instance!.toLowerCase()))
    : failedInstances;

  const scoped = candidates.filter((candidate) => matchesFilter(candidate, filter));
  const needle = nameOrId.toLowerCase();
  const exact = scoped.filter(
    (candidate) =>
      candidate.id === nameOrId ||
      candidate.name.toLowerCase() === needle ||
      candidate.appName.toLowerCase() === needle,
  );
  const matches =
    exact.length > 0 ? exact : scoped.filter((candidate) => candidate.name.toLowerCase().includes(needle));

  const unreachableNote =
    relevantFailures.length > 0
      ? ` (${relevantFailures.map((failed) => `"${failed.name}" could not be reached: ${failed.error}`).join("; ")})`
      : "";

  if (matches.length === 0) {
    throw new Error(`No service matching "${nameOrId}" was found${unreachableNote}.`);
  }
  if (matches.length > 1) {
    const list = matches
      .map(
        (candidate) =>
          `${candidate.name} (${candidate.deployType} in ${candidate.projectName}/${candidate.environmentName} on ${candidate.instanceName})`,
      )
      .join("; ");
    throw new Error(
      `Multiple services match "${nameOrId}": ${list}. Narrow the search with "project", "kind", or "instance".`,
    );
  }
  // Exactly one reachable match - but an instance this search couldn't rule out is still
  // unreachable, and it might hold another service with the same name. Fail rather than silently
  // act on the wrong one; narrowing with "instance" (once the other instance is confirmed
  // irrelevant) bypasses this.
  if (relevantFailures.length > 0) {
    throw new Error(
      `Found "${matches[0].name}", but this name couldn't be checked on every instance${unreachableNote} - narrow with "instance" once you've confirmed it isn't the one you mean.`,
    );
  }
  return matches[0];
}
