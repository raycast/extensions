import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFrecencySorting } from "@raycast/utils";
import { AddInstance } from "./instances";
import { ACTION_ICONS, ACTION_LABELS, SERVICE_ACTIONS, runServiceAction, statusAccessory } from "./service-actions";
import ServiceLogs from "./service-logs";
import { Candidate, FailedInstance, loadCandidates } from "./candidates";

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
      const result = await loadCandidates();
      setHasInstances(result.hasInstances);
      setCandidates(result.candidates);
      // A rejected instance shouldn't just quietly disappear from the results - the user needs to
      // know this search wasn't actually complete, not read the shorter list as "that's everything."
      setFailedInstances(result.failedInstances);
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
