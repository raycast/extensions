import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { AddInstance, Instance, tokenForInstance } from "./instances";
import { Project, ServiceCollections } from "./interfaces";
import { isModernProject } from "./utils";
import { ACTION_ICONS, ACTION_LABELS, SERVICE_ACTIONS, runServiceAction, statusAccessory } from "./service-actions";
import ServiceLogs from "./service-logs";

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

interface Candidate {
  id: string;
  idField: string;
  deployType: string;
  icon: string;
  name: string;
  appName: string;
  status: string;
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

interface FailedInstance {
  name: string;
  error: string;
}

/**
 * Lets you search for a service by name across every configured instance, see what it's doing, and
 * act on it (deploy/redeploy/start/stop/... and view logs) - a shortcut for the common "I know the
 * name, just deploy it" case, without navigating Projects -> Environments -> Services first.
 *
 * Always lists matches and waits for an explicit selection rather than guessing at a single "best"
 * match and acting on it automatically - the extension supports several Dokploy instances, and two
 * of them can have a same-named service, so picking one for the user risks acting on the wrong
 * server. Raycast's own List search does the matching; this only has to load every candidate once.
 * Reuses the lifecycle-action logic already reviewed in services.tsx (`src/service-actions.ts`)
 * rather than reimplementing it, and sorts by frecency so services you actually act on here surface
 * first next time.
 */
export default function DeployService() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasInstances, setHasInstances] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [failedInstances, setFailedInstances] = useState<FailedInstance[]>([]);
  const [error, setError] = useState<string>();

  const { data: sorted, visitItem } = useFrecencySorting(candidates, {
    key: (candidate) => `${candidate.instanceName}-${candidate.id}`,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const raw = await LocalStorage.getItem<string>("instances");
      const instances: Instance[] = raw ? JSON.parse(raw) : [];
      setHasInstances(instances.length > 0);
      if (instances.length === 0) {
        setCandidates([]);
        setFailedInstances([]);
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
      // A rejected instance shouldn't just quietly disappear from the results - the user needs to
      // know this search wasn't actually complete, not read the shorter list as "that's everything."
      setFailedInstances(
        results.flatMap((result, index) =>
          result.status === "rejected" ? [{ name: instances[index].name, error: `${result.reason}` }] : [],
        ),
      );
    } catch (err) {
      setError(`${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Deploy Service" searchBarPlaceholder="Search services to act on…">
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
      ) : !isLoading && !hasInstances ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No Instances Configured"
          description="Add an instance to search its services."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Instance" target={<AddInstance />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {failedInstances.length > 0 && (
            <List.Section title="Could Not Load">
              {failedInstances.map((failed) => (
                <List.Item
                  key={failed.name}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  title={failed.name}
                  subtitle={failed.error}
                  actions={
                    <ActionPanel>
                      <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => load()} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {sorted.map((candidate) => {
            // Legacy projects, and modern ones with a single environment, would otherwise repeat the
            // project name here for no reason.
            const scopeSuffix =
              candidate.environmentName !== candidate.projectName ? ` / ${candidate.environmentName}` : "";
            return (
              <List.Item
                key={`${candidate.instanceName}-${candidate.id}`}
                icon={candidate.icon}
                title={candidate.name}
                subtitle={`${candidate.instanceName} / ${candidate.projectName}${scopeSuffix}`}
                accessories={[statusAccessory(candidate.status)]}
                actions={
                  <ActionPanel>
                    {SERVICE_ACTIONS[candidate.deployType].map((action) => (
                      <Action
                        key={action}
                        icon={ACTION_ICONS[action]}
                        title={ACTION_LABELS[action]}
                        style={action === "stop" ? Action.Style.Destructive : undefined}
                        onAction={() => {
                          void visitItem(candidate);
                          void runServiceAction(
                            candidate.url,
                            candidate.headers,
                            {
                              id: candidate.id,
                              type: candidate.deployType,
                              name: candidate.name,
                              appName: candidate.appName,
                            },
                            action,
                            load,
                          );
                        }}
                      />
                    ))}
                    <Action.Push
                      icon={Icon.Terminal}
                      title="View Logs"
                      target={
                        <ServiceLogs
                          service={{ id: candidate.id, type: candidate.deployType, name: candidate.name }}
                          token={{ url: candidate.url, headers: candidate.headers }}
                        />
                      }
                      onPush={() => visitItem(candidate)}
                    />
                    <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => load()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}
