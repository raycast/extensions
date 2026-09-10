/**
 * Every object the application manages, with what ArgoCD believes about each one.
 *
 * This costs no request: `status.resources` arrives inside the application object. It is the
 * answer to the question an out-of-sync application actually raises, which is "out of sync in
 * what way", and it is the reason the detail view leads with the resources that need attention
 * rather than with metadata.
 */

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { orderResources, resourceKey, resourceNeedsAttention } from "../lib/argocd/project";
import type { ResourceCounts, ResourceStatus } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { makeClient } from "./deps";
import { ResourceDiffView } from "./ResourceDiffView";
import { healthIcon, syncIcon } from "./statusVisuals";

interface Props {
  appName: string;
  appNamespace: string;
  instance: ArgoInstance;
  resources: ResourceStatus[];
  counts: ResourceCounts;
}

function resourceAccessories(resource: ResourceStatus): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (resource.requiresPruning) {
    accessories.push({
      tag: { value: "prune", color: Color.Orange },
      tooltip: "Exists in the cluster but not in git. A sync with prune would delete it.",
    });
  }
  if (resource.hook) {
    accessories.push({ tag: { value: "hook", color: Color.SecondaryText } });
  }
  if (resource.syncWave !== undefined && resource.syncWave !== 0) {
    accessories.push({ text: `wave ${resource.syncWave}`, tooltip: "Sync wave" });
  }
  if (resource.status === "") {
    // Not the same as Unknown: ArgoCD has not compared this resource yet.
    accessories.push({ tag: { value: "not compared", color: Color.SecondaryText } });
  } else {
    accessories.push({ icon: syncIcon(resource.status), tooltip: `Sync: ${resource.status}` });
  }
  if (resource.health) {
    accessories.push({ icon: healthIcon(resource.health), tooltip: `Health: ${resource.health}` });
  }
  return accessories;
}

export function ResourcesList({ appName, appNamespace, instance, resources, counts }: Props) {
  const { push } = useNavigation();
  const client = makeClient(instance);

  const [attention, rest] = useMemo(() => {
    const ordered = orderResources(resources);
    return [ordered.filter(resourceNeedsAttention), ordered.filter((r) => !resourceNeedsAttention(r))];
  }, [resources]);

  function actionsFor(resource: ResourceStatus) {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Show Diff"
            icon={Icon.Document}
            onAction={() =>
              push(
                <ResourceDiffView
                  appName={appName}
                  appNamespace={appNamespace}
                  instance={instance}
                  resource={resource}
                />,
              )
            }
          />
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={client.resourceUrl(appName, appNamespace, resource)}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Resource Name" content={resource.name} />
          <Action.CopyToClipboard
            title="Copy Kubectl Command"
            content={`kubectl -n ${resource.namespace} get ${[resource.kind.toLowerCase(), resource.group]
              .filter(Boolean)
              .join(".")} ${resource.name} -o yaml`}
          />
          <Action
            title="Show Diff of the Whole Application"
            icon={Icon.Document}
            onAction={() =>
              push(<ResourceDiffView appName={appName} appNamespace={appNamespace} instance={instance} />)
            }
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function row(resource: ResourceStatus) {
    return (
      <List.Item
        key={resourceKey(resource)}
        icon={{ source: Icon.Box, tintColor: Color.SecondaryText }}
        title={resource.name || resource.kind}
        subtitle={[resource.kind, resource.namespace].filter(Boolean).join(" in ")}
        accessories={resourceAccessories(resource)}
        actions={actionsFor(resource)}
      />
    );
  }

  return (
    <List
      navigationTitle={`Resources of ${appName}`}
      searchBarPlaceholder="Filter resources by name, kind or namespace"
    >
      <List.EmptyView
        icon={Icon.Box}
        title="No resource recorded"
        description="ArgoCD has not reported any managed resource for this application yet. A refresh may fill it in."
      />
      {attention.length > 0 ? (
        <List.Section
          title="Needs attention"
          subtitle={[
            counts.outOfSync > 0 ? `${counts.outOfSync} out of sync` : undefined,
            counts.degraded > 0 ? `${counts.degraded} degraded` : undefined,
            counts.needsPruning > 0 ? `${counts.needsPruning} to prune` : undefined,
          ]
            .filter(Boolean)
            .join(", ")}
        >
          {attention.map(row)}
        </List.Section>
      ) : null}
      {rest.length > 0 ? (
        <List.Section title="Healthy" subtitle={`${rest.length} of ${counts.total}`}>
          {rest.map(row)}
        </List.Section>
      ) : null}
    </List>
  );
}
