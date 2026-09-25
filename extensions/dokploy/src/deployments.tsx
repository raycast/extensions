import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { AddInstance } from "./instances";
import { Candidate, FailedInstance, loadCandidates } from "./candidates";
import { mapWithConcurrency } from "./concurrency";
import DeploymentHistory, {
  DeployableKind,
  Deployment,
  ENDPOINTS,
  ID_FIELDS,
  STATUS_COLORS,
} from "./deployment-history";
import { ACTION_ICONS, ACTION_LABELS, SERVICE_ACTIONS, runServiceAction } from "./service-actions";
import ServiceLogs from "./service-logs";
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
 * Reuses `loadCandidates()` (the same instance fan-out `Deploy Service` already built and got
 * reviewed), then queues one deployment-history fetch per service through `mapWithConcurrency` -
 * a self-hosted Dokploy instance isn't built to take hundreds of simultaneous requests, so every
 * service is covered, just not all at once. Rows fill in as their own fetch settles; the whole
 * list is sorted by most recent deployment only once every fetch has settled, so rows don't jump
 * around mid-load.
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
      const result = await loadCandidates();
      if (!isCurrent()) return;
      setHasInstances(result.hasInstances);
      // A rejected instance shouldn't just quietly disappear from the results - the user needs to
      // know this feed wasn't actually complete, not read the shorter list as "that's everything."
      setFailedInstances(result.failedInstances);

      const filtered = result.candidates.filter(
        (candidate) => candidate.deployType === "application" || candidate.deployType === "compose",
      );
      setEntries(filtered.map((candidate) => ({ candidate, state: { kind: "loading" } })));
      if (filtered.length === 0) return;

      await mapWithConcurrency(filtered, 5, async (candidate) => {
        const state = await fetchLatestDeployment(candidate);
        if (!isCurrent()) return;
        setEntries((current) => current.map((entry) => (entry.candidate === candidate ? { ...entry, state } : entry)));
      });

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
          title="No Deployable Services"
          description="No Applications or Compose stacks were found across your configured instances."
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
