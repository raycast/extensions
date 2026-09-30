import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { AddInstance, Instance, instanceId, tokenForInstance } from "./instances";
import {
  Candidate,
  FailedInstance,
  iconForDeployType,
  loadConfiguredInstances,
  loadInstanceCandidates,
} from "./candidates";
import { mapWithConcurrency } from "./concurrency";
import DeploymentHistory, {
  DeployableKind,
  Deployment,
  ENDPOINTS,
  ID_FIELDS,
  STATUS_COLORS,
  sortDeploymentsByRecency,
} from "./deployment-history";
import { ACTION_ICONS, ACTION_LABELS, SERVICE_ACTIONS, runServiceAction } from "./service-actions";
import ServiceLogs from "./service-logs";
import { OpenWebsiteAction } from "./open-website";
import { parseTrpcJsonResponse, trpcQueryUrl } from "./trpc";

type DeploymentState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; deployment: Deployment };

interface Entry {
  candidate: Candidate;
  state: DeploymentState;
}

async function fetchLatestDeployment(candidate: Candidate): Promise<DeploymentState> {
  try {
    const kind = candidate.deployType as DeployableKind;
    const requestUrl = trpcQueryUrl(candidate.url, ENDPOINTS[kind], { [ID_FIELDS[kind]]: candidate.id });
    const response = await fetch(requestUrl, { headers: candidate.headers });
    const deployments = await parseTrpcJsonResponse<Deployment[]>(response);
    if (!deployments || deployments.length === 0) return { kind: "empty" };
    // Defensive - `deployment.all`/`allByCompose` have always come back newest-first in practice,
    // but nothing guarantees that ordering, and picking the wrong one would misreport this
    // service's most recent activity.
    const [latest] = [...deployments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { kind: "loaded", deployment: latest };
  } catch (error) {
    return { kind: "error", message: `${error}` };
  }
}

interface CentralizedService {
  name: string;
  appName: string;
  environment: { name: string; project: { name: string } };
}

interface CentralizedDeployment extends Deployment {
  application: (CentralizedService & { applicationId: string }) | null;
  compose: (CentralizedService & { composeId: string }) | null;
}

/**
 * One request for the whole instance: `deployment.allCentralized` (Dokploy v0.29.0+) returns every
 * application/compose deployment in the organization, each with its service, environment, and
 * project. Only services with at least one deployment appear. Returns `undefined` when the
 * instance is too old to have the route (404) or the key's role isn't allowed to use it (401/403),
 * so the caller can fall back to per-service requests.
 */
async function loadCentralizedEntries(instance: Instance): Promise<Entry[] | undefined> {
  const { url, headers } = tokenForInstance(instance);
  const response = await fetch(trpcQueryUrl(url, "deployment.allCentralized", {}), { headers });
  if ([401, 403, 404].includes(response.status)) return undefined;
  const rows = await parseTrpcJsonResponse<CentralizedDeployment[]>(response);

  const latest = new Map<string, Entry>();
  for (const row of sortDeploymentsByRecency(rows ?? []) as CentralizedDeployment[]) {
    const service = row.application ?? row.compose;
    if (!service) continue;
    const deployType = row.application ? "application" : "compose";
    const id = row.application ? row.application.applicationId : row.compose!.composeId;
    if (latest.has(id)) continue;
    latest.set(id, {
      candidate: {
        id,
        idField: ID_FIELDS[deployType],
        deployType,
        icon: iconForDeployType(deployType),
        name: service.name || service.appName || id,
        appName: service.appName ?? "",
        status: "",
        instanceKey: instanceId(instance),
        instanceName: instance.name,
        projectName: service.environment.project.name,
        environmentName: service.environment.name,
        url,
        headers,
      },
      state: { kind: "loaded", deployment: row },
    });
  }
  return [...latest.values()];
}

function isDeployable(candidate: Candidate) {
  return candidate.deployType === "application" || candidate.deployType === "compose";
}

function sortEntries(entries: Entry[]): Entry[] {
  function sortKey(entry: Entry): number {
    return entry.state.kind === "loaded" ? new Date(entry.state.deployment.createdAt).getTime() : -Infinity;
  }
  // Array.prototype.sort is stable, so entries with no successful record (still -Infinity) keep
  // their original relative order among themselves rather than getting shuffled.
  return [...entries].sort((a, b) => sortKey(b) - sortKey(a));
}

function accessoriesForState(state: DeploymentState): List.Item.Accessory[] {
  switch (state.kind) {
    case "loaded":
      return [
        {
          icon: { source: Icon.CircleFilled, tintColor: STATUS_COLORS[state.deployment.status] },
          tooltip: state.deployment.status,
        },
        { date: new Date(state.deployment.createdAt) },
      ];
    case "empty":
      return [{ text: "Never deployed" }];
    case "error":
      return [
        {
          icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
          text: "Could not load",
          tooltip: state.message,
        },
      ];
    case "loading":
      return [{ text: "Loading…" }];
  }
}

/**
 * Shows the most recent deployment for every Application and Compose stack across every configured
 * instance, sorted by recency - a feed for "what's happened lately", without opening Projects ->
 * Environments -> Services -> View Deployments for each one by hand. Databases are excluded: they
 * don't go through a build/deploy pipeline, so `deployment.all`/`deployment.allByCompose` (the only
 * routes with deployment history) never apply to them - matching how `services.tsx`'s own "View
 * Deployments" action is already gated to just these two kinds.
 *
 * Each instance is read with a single `deployment.allCentralized` request. Instances older than
 * Dokploy v0.29.0 fall back to `loadInstanceCandidates()` plus one deployment-history fetch per
 * service, queued through `mapWithConcurrency` - those rows fill in as their own fetch settles.
 * The whole list is sorted by most recent deployment only once everything has settled, so rows
 * don't jump around mid-load.
 */
export default function Deployments() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasInstances, setHasInstances] = useState(true);
  const [failedInstances, setFailedInstances] = useState<FailedInstance[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string>();
  // A second Refresh while one load() is still running must not let the older call's late-arriving
  // writes clear isLoading early or stomp the newer call's results - only the latest load() is ever
  // allowed to write state.
  const currentLoadId = useRef(0);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const loadId = ++currentLoadId.current;
    const isCurrent = () => loadId === currentLoadId.current;

    setIsLoading(true);
    setError(undefined);
    try {
      const instances = await loadConfiguredInstances();
      if (!isCurrent()) return;
      setHasInstances(instances.length > 0);

      const results = await Promise.allSettled(
        instances.map(async (instance) => {
          const centralized = await loadCentralizedEntries(instance);
          if (centralized) return { entries: centralized, pending: [] as Candidate[] };
          const pending = (await loadInstanceCandidates(instance)).filter(isDeployable);
          return { entries: pending.map((candidate): Entry => ({ candidate, state: { kind: "loading" } })), pending };
        }),
      );
      if (!isCurrent()) return;
      // A rejected instance shouldn't just quietly disappear from the results - the user needs to
      // know this feed wasn't actually complete, not read the shorter list as "that's everything."
      setFailedInstances(
        results.flatMap((result, index) =>
          result.status === "rejected" ? [{ name: instances[index].name, error: `${result.reason}` }] : [],
        ),
      );
      const loaded = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      setEntries(loaded.flatMap((result) => result.entries));

      await mapWithConcurrency(
        loaded.flatMap((result) => result.pending),
        5,
        async (candidate) => {
          const state = await fetchLatestDeployment(candidate);
          if (!isCurrent()) return;
          setEntries((current) =>
            current.map((entry) => (entry.candidate === candidate ? { ...entry, state } : entry)),
          );
        },
      );

      if (!isCurrent()) return;
      setEntries((current) => sortEntries(current));
    } catch (err) {
      if (!isCurrent()) return;
      setError(`${err}`);
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Deployments" searchBarPlaceholder="Search deployments…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load deployments"
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
          description="Add an instance to see its deployments."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Instance" target={<AddInstance />} />
            </ActionPanel>
          }
        />
      ) : !isLoading && entries.length === 0 && failedInstances.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Deployments"
          description="No Application or Compose stack has been deployed yet across your configured instances."
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => load()} />
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
          {entries.map(({ candidate, state }) => {
            // Legacy projects, and modern ones with a single environment, would otherwise repeat the
            // project name here for no reason.
            const scopeSuffix =
              candidate.environmentName !== candidate.projectName ? ` / ${candidate.environmentName}` : "";
            const token = { url: candidate.url, headers: candidate.headers };
            const deployType = candidate.deployType as DeployableKind;

            return (
              <List.Item
                key={`${candidate.instanceKey}-${candidate.id}`}
                icon={candidate.icon}
                title={candidate.name}
                subtitle={`${candidate.instanceName} / ${candidate.projectName}${scopeSuffix}`}
                accessories={accessoriesForState(state)}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.List}
                      title="View Deployments"
                      target={
                        <DeploymentHistory
                          service={{ id: candidate.id, type: deployType, name: candidate.name }}
                          token={token}
                        />
                      }
                    />
                    {SERVICE_ACTIONS[candidate.deployType].map((action) => (
                      <Action
                        key={action}
                        icon={ACTION_ICONS[action]}
                        title={ACTION_LABELS[action]}
                        style={action === "stop" ? Action.Style.Destructive : undefined}
                        onAction={() =>
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
                          )
                        }
                      />
                    ))}
                    <Action.Push
                      icon={Icon.Terminal}
                      title="View Logs"
                      target={
                        <ServiceLogs
                          service={{ id: candidate.id, type: candidate.deployType, name: candidate.name }}
                          token={token}
                        />
                      }
                    />
                    <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => load()} />
                    <OpenWebsiteAction
                      service={{ id: candidate.id, type: deployType, name: candidate.name }}
                      url={candidate.url}
                      headers={candidate.headers}
                    />
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
