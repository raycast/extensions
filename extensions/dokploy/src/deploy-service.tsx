import { LaunchProps, LocalStorage, showHUD } from "@raycast/api";
import { Instance, tokenForInstance } from "./instances";
import { ErrorResult, Project, ServiceCollections } from "./interfaces";
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

interface Candidate {
  id: string;
  idField: string;
  deployType: string;
  name: string;
  appName: string;
  instanceName: string;
  projectName: string;
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
          candidates.push({
            id: (service as unknown as Record<string, string>)[KIND_ID_FIELDS[kind]],
            idField: KIND_ID_FIELDS[kind],
            deployType: DEPLOY_TYPES[kind],
            name: service.name,
            appName: service.appName,
            instanceName: instance.name,
            projectName: project.name,
            url,
            headers,
          });
        }
      }
    }
  }

  return candidates;
}

function matches(candidate: Candidate, query: string): "exact" | "partial" | null {
  const name = candidate.name.toLowerCase();
  const appName = candidate.appName.toLowerCase();
  if (name === query || appName === query) return "exact";
  if (name.includes(query) || appName.includes(query)) return "partial";
  return null;
}

function describe(candidate: Candidate): string {
  return `${candidate.instanceName}/${candidate.projectName}/${candidate.name}`;
}

/**
 * Deploys a service by name without navigating Projects -> Environments -> Services.
 *
 * A `no-view` command: Raycast calls this default export directly rather than mounting it as a
 * React component, so it must be a plain async function - React hooks (`useState`, `useLocalStorage`,
 * etc.) have no render/dispatcher to attach to here and throw ("Cannot read properties of null
 * (reading 'useRef')") if used. `LocalStorage` (the plain, non-hook API) is used instead, reading
 * the same `"instances"` key `useLocalStorage` in `instances.tsx` writes.
 *
 * Searches every configured instance, not just the currently-active one - the extension supports
 * several Dokploy instances, and silently deploying to whichever one happens to be active when two
 * of them have a same-named service would risk deploying to the wrong server. A name that matches
 * more than one service anywhere (same instance or across instances) is refused, not guessed at.
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.DeployService }>) {
  const query = props.arguments.name.trim().toLowerCase();
  if (!query) {
    await showHUD("Enter a service name");
    return;
  }

  const raw = await LocalStorage.getItem<string>("instances");
  const instances: Instance[] = raw ? JSON.parse(raw) : [];
  if (instances.length === 0) {
    await showHUD("No instances configured");
    return;
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

  const candidates = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const exact = candidates.filter((candidate) => matches(candidate, query) === "exact");
  const partial = exact.length === 0 ? candidates.filter((candidate) => matches(candidate, query) === "partial") : [];
  const found = exact.length > 0 ? exact : partial;

  if (found.length === 0) {
    await showHUD(`No service found matching "${props.arguments.name}"`);
    return;
  }

  if (found.length > 1) {
    const shown = found.slice(0, 3).map(describe).join(", ");
    const rest = found.length > 3 ? ` and ${found.length - 3} more` : "";
    await showHUD(`Multiple matches for "${props.arguments.name}": ${shown}${rest} - be more specific`);
    return;
  }

  const [target] = found;
  try {
    const response = await fetch(`${target.url}${target.deployType}.deploy`, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify({ [target.idField]: target.id }),
    });
    if (!response.ok) {
      const err = (await response.json()) as ErrorResult;
      throw new Error(err.message);
    }
    await showHUD(`Deployed "${target.name}"`);
  } catch (error) {
    await showHUD(`Could not deploy "${target.name}": ${error}`);
  }
}
