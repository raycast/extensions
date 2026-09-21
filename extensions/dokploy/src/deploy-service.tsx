import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
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
const KIND_ICONS: Record<Kind, string> = {
  applications: Icon.Globe,
  mariadb: "mariadb.svg",
  mongo: "mongo.svg",
  mysql: "mysql.svg",
  postgres: "postgres.svg",
  redis: "redis.svg",
  compose: "circuit-board.svg",
};

interface Candidate {
  id: string;
  idField: string;
  deployType: string;
  icon: string;
  name: string;
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
          const id = (service as unknown as Record<string, string>)[KIND_ID_FIELDS[kind]];
          candidates.push({
            id,
            idField: KIND_ID_FIELDS[kind],
            deployType: DEPLOY_TYPES[kind],
            icon: KIND_ICONS[kind],
            // Dokploy allows saving a service with no name - falls back to appName, then the id,
            // so this is never empty (matches the same fallback used in service-env.tsx and others).
            name: service.name || service.appName || id,
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

/**
 * Lets you search for a service by name across every configured instance and deploy the one you
 * pick - a shortcut for the common "I know the name, just deploy it" case, without navigating
 * Projects -> Environments -> Services first.
 *
 * Always lists matches and waits for an explicit selection rather than guessing at a single "best"
 * match and deploying it automatically - the extension supports several Dokploy instances, and two
 * of them can have a same-named service, so picking one for the user risks deploying to the wrong
 * server. Raycast's own List search does the matching; this only has to load every candidate once.
 */
export default function DeployService() {
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const raw = await LocalStorage.getItem<string>("instances");
      const instances: Instance[] = raw ? JSON.parse(raw) : [];
      if (instances.length === 0) {
        setCandidates([]);
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

      setCandidates(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
    } catch (err) {
      setError(`${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function deploy(candidate: Candidate) {
    const toast = await showToast(Toast.Style.Animated, `Deploying ${candidate.name}…`);
    try {
      const response = await fetch(`${candidate.url}${candidate.deployType}.deploy`, {
        method: "POST",
        headers: candidate.headers,
        body: JSON.stringify({ [candidate.idField]: candidate.id }),
      });
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Deployed ${candidate.name}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not deploy";
      toast.message = `${err}`;
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Deploy Service" searchBarPlaceholder="Search services to deploy…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load services"
          description={error}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => load()} />
            </ActionPanel>
          }
        />
      ) : (
        candidates.map((candidate) => (
          <List.Item
            key={`${candidate.instanceName}-${candidate.id}`}
            icon={candidate.icon}
            title={candidate.name}
            subtitle={`${candidate.instanceName} / ${candidate.projectName}`}
            actions={
              <ActionPanel>
                <Action icon={Icon.Rocket} title="Deploy" onAction={() => deploy(candidate)} />
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => load()} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
