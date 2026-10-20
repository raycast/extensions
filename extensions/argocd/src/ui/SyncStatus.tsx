/**
 * Follows a running sync.
 *
 * Polling one field-projected application every two seconds is a few kilobytes per tick, and it
 * stops on its own the moment the phase leaves Running or Terminating. An SSE stream would be
 * cheaper in theory and worse in practice: a Raycast view is short-lived and a dropped stream
 * fails far less gracefully than a missed poll.
 */

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppDetail, AppSummary } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { makeClient } from "./deps";
import { healthIcon, phaseIcon, syncIcon } from "./statusVisuals";

const POLL_MS = 2000;

interface Props {
  app: AppSummary;
  instance: ArgoInstance;
}

function resourceIcon(status: string): { source: Icon; tintColor: Color } {
  switch (status) {
    case "Synced":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "SyncFailed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "PruneSkipped":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  }
}

export function SyncStatus({ app, instance }: Props) {
  const { pop } = useNavigation();
  const [detail, setDetail] = useState<AppDetail | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [watching, setWatching] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stop = useCallback(() => {
    setWatching(false);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const client = makeClient(instance);

    async function tick() {
      try {
        const next = await client.getApplicationStatus(app.name, app.namespace);
        if (cancelled) {
          return;
        }
        setDetail(next);
        setError(undefined);
        const running = next.phase === "Running" || next.phase === "Terminating";
        if (!running) {
          setWatching(false);
          return;
        }
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setError(caught as Error);
        setWatching(false);
        return;
      }
      timer.current = setTimeout(() => void tick(), POLL_MS);
    }

    void tick();

    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [app.name, app.namespace, instance]);

  const phase = detail?.phase;
  const url = makeClient(instance).appUrl(app.name, app.namespace);

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in ArgoCD" url={url} />
      {watching ? <Action title="Stop Watching" icon={Icon.Stop} onAction={stop} /> : null}
      <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
    </ActionPanel>
  );

  return (
    <List
      isLoading={watching && detail === undefined}
      navigationTitle={`Sync status of ${app.name} on ${instance.name}`}
      searchBarPlaceholder="Filter resources"
    >
      {error ? (
        <List.Section title="Error">
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Could not read the sync status"
            subtitle={error.message}
            actions={actions}
          />
        </List.Section>
      ) : null}

      <List.Section title="Operation" subtitle={watching ? "watching" : "not watching"}>
        <List.Item
          icon={phase ? phaseIcon(phase) : { source: Icon.Clock, tintColor: Color.SecondaryText }}
          title={phase ?? "No operation recorded"}
          subtitle={detail?.operationMessage ?? undefined}
          accessories={[
            ...(detail?.operationStartedAt ? [{ text: `started ${detail.operationStartedAt}` }] : []),
            ...(detail?.finishedAt ? [{ text: `finished ${detail.finishedAt}` }] : []),
          ]}
          actions={actions}
        />
        {detail ? (
          <List.Item
            icon={syncIcon(detail.sync)}
            title={`Sync: ${detail.sync}`}
            accessories={[{ icon: healthIcon(detail.health), text: `Health: ${detail.health}` }]}
            actions={actions}
          />
        ) : null}
      </List.Section>

      {detail && detail.syncResources.length > 0 ? (
        <List.Section title="Resources" subtitle={`${detail.syncResources.length}`}>
          {detail.syncResources.map((resource) => (
            <List.Item
              key={`${resource.group}/${resource.kind}/${resource.namespace}/${resource.name}`}
              icon={resourceIcon(resource.status)}
              title={resource.name}
              subtitle={[resource.kind, resource.namespace].filter(Boolean).join(" in ")}
              accessories={[
                ...(resource.hookPhase ? [{ text: resource.hookPhase }] : []),
                { text: resource.status || "pending" },
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
