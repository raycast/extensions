import { Action, ActionPanel, Color, Grid, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { applicationUrl, getApplicationResourceTree, ResourceTreeNode, resourceUrl } from "./argocd";
import { PodContainerPicker } from "./pod-logs";
import { ResourceManifest } from "./resource-manifest";
import { healthIcon } from "./status";

const KIND_SVG: Record<string, string> = {
  Pod: "resources/pod.svg",
  Deployment: "resources/deploy.svg",
  ReplicaSet: "resources/rs.svg",
  StatefulSet: "resources/sts.svg",
  DaemonSet: "resources/ds.svg",
  Job: "resources/job.svg",
  CronJob: "resources/cronjob.svg",
  Service: "resources/svc.svg",
  Endpoints: "resources/ep.svg",
  EndpointSlice: "resources/ep.svg",
  Ingress: "resources/ing.svg",
  ConfigMap: "resources/cm.svg",
  Secret: "resources/secret.svg",
  Namespace: "resources/ns.svg",
  PersistentVolumeClaim: "resources/pvc.svg",
  PersistentVolume: "resources/pv.svg",
  StorageClass: "resources/sc.svg",
  ServiceAccount: "resources/sa.svg",
  Role: "resources/role.svg",
  RoleBinding: "resources/rb.svg",
  ClusterRole: "resources/c-role.svg",
  ClusterRoleBinding: "resources/crb.svg",
  HorizontalPodAutoscaler: "resources/hpa.svg",
  NetworkPolicy: "resources/netpol.svg",
  CustomResourceDefinition: "resources/crd.svg",
  ResourceQuota: "resources/quota.svg",
  LimitRange: "resources/limits.svg",
  PodSecurityPolicy: "resources/psp.svg",
  Group: "resources/group.svg",
  User: "resources/user.svg",
};

function iconForKind(kind: string): Image.ImageLike {
  const svg = KIND_SVG[kind];
  if (svg) return svg;
  return Icon.Box;
}

function tintedIconForKind(kind: string, tint: Color): Image.ImageLike {
  const svg = KIND_SVG[kind];
  if (svg) return svg;
  return { source: Icon.Box, tintColor: tint };
}

interface KindGroup {
  kind: string;
  nodes: ResourceTreeNode[];
  worstHealth?: string;
}

const HEALTH_SEVERITY: Record<string, number> = {
  Degraded: 4,
  Missing: 3,
  Suspended: 2,
  Progressing: 1,
  Healthy: 0,
};

function groupByKind(nodes: ResourceTreeNode[]): KindGroup[] {
  const groups = new Map<string, KindGroup>();
  for (const n of nodes) {
    const kind = n.kind ?? "Unknown";
    let g = groups.get(kind);
    if (!g) {
      g = { kind, nodes: [] };
      groups.set(kind, g);
    }
    g.nodes.push(n);
    const h = n.health?.status;
    if (h && (g.worstHealth === undefined || (HEALTH_SEVERITY[h] ?? -1) > (HEALTH_SEVERITY[g.worstHealth] ?? -1))) {
      g.worstHealth = h;
    }
  }
  return [...groups.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}

function tintForGroup(g: KindGroup): Color {
  if (g.worstHealth === "Degraded" || g.worstHealth === "Missing") return Color.Red;
  if (g.worstHealth === "Progressing") return Color.Blue;
  if (g.worstHealth === "Suspended") return Color.Yellow;
  if (g.worstHealth === "Healthy") return Color.Green;
  return Color.SecondaryText;
}

function buildChildIndex(nodes: ResourceTreeNode[]): Map<string, ResourceTreeNode[]> {
  const index = new Map<string, ResourceTreeNode[]>();
  for (const n of nodes) {
    for (const p of n.parentRefs ?? []) {
      if (!p.uid) continue;
      const existing = index.get(p.uid);
      if (existing) existing.push(n);
      else index.set(p.uid, [n]);
    }
  }
  return index;
}

export function ApplicationResourcesByKind({ appName }: { appName: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (n: string) => getApplicationResourceTree(n),
    [appName],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load resources", message: err.message });
      },
    },
  );

  const groups = useMemo(() => groupByKind(data?.nodes ?? []), [data]);
  const childIndex = useMemo(() => buildChildIndex(data?.nodes ?? []), [data]);
  const orphanedCount = data?.orphanedNodes?.length ?? 0;

  return (
    <Grid
      isLoading={isLoading}
      navigationTitle={`${appName} · Resources`}
      searchBarPlaceholder="Filter by kind..."
      columns={5}
      inset={Grid.Inset.Medium}
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Failed to load resources"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : groups.length === 0 && !isLoading ? (
        <Grid.EmptyView icon={Icon.Box} title="No resources" description="This application has no tracked resources." />
      ) : (
        <>
          <Grid.Section title="Managed" subtitle={`${groups.reduce((n, g) => n + g.nodes.length, 0)}`}>
            {groups.map((g) => (
              <Grid.Item
                key={g.kind}
                title={g.kind}
                subtitle={`${g.nodes.length}`}
                content={{ value: tintedIconForKind(g.kind, tintForGroup(g)), tooltip: g.kind }}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`View ${g.kind}`}
                      icon={Icon.ArrowRight}
                      target={
                        <ResourcesOfKind appName={appName} kind={g.kind} nodes={g.nodes} childIndex={childIndex} />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open in ArgoCD"
                      url={applicationUrl(appName)}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
                    />
                    <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
          {orphanedCount > 0 ? (
            <Grid.Section title="Orphaned" subtitle={`${orphanedCount}`}>
              {groupByKind(data?.orphanedNodes ?? []).map((g) => (
                <Grid.Item
                  key={`orphan-${g.kind}`}
                  title={g.kind}
                  subtitle={`${g.nodes.length}`}
                  content={{ value: tintedIconForKind(g.kind, Color.Orange), tooltip: `Orphaned ${g.kind}` }}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`View ${g.kind}`}
                        icon={Icon.ArrowRight}
                        target={
                          <ResourcesOfKind
                            appName={appName}
                            kind={g.kind}
                            nodes={g.nodes}
                            childIndex={childIndex}
                            orphaned
                          />
                        }
                      />
                      <Action.OpenInBrowser
                        title="Open in ArgoCD"
                        url={applicationUrl(appName)}
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "b" },
                          Windows: { modifiers: ["ctrl"], key: "b" },
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </Grid.Section>
          ) : null}
        </>
      )}
    </Grid>
  );
}

function ResourcesOfKind({
  appName,
  kind,
  nodes,
  childIndex,
  orphaned,
}: {
  appName: string;
  kind: string;
  nodes: ResourceTreeNode[];
  childIndex: Map<string, ResourceTreeNode[]>;
  orphaned?: boolean;
}) {
  const sorted = useMemo(() => [...nodes].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")), [nodes]);
  return (
    <List
      navigationTitle={`${appName} · ${kind}${orphaned ? " (Orphaned)" : ""}`}
      searchBarPlaceholder={`Filter ${kind}...`}
    >
      <List.Section title={kind} subtitle={`${sorted.length}`}>
        {sorted.map((n, i) => (
          <ResourceRow
            key={`${n.uid ?? ""}/${n.namespace ?? ""}/${n.name ?? ""}/${i}`}
            appName={appName}
            node={n}
            fallbackKind={kind}
            childIndex={childIndex}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ResourceChildren({
  appName,
  parent,
  childIndex,
}: {
  appName: string;
  parent: ResourceTreeNode;
  childIndex: Map<string, ResourceTreeNode[]>;
}) {
  const children = (parent.uid ? childIndex.get(parent.uid) : undefined) ?? [];
  const groups = useMemo(() => {
    const sorted = groupByKind(children);
    for (const g of sorted) {
      g.nodes.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }
    return sorted;
  }, [children]);
  const parentTitle = parent.name ?? "(unnamed)";
  return (
    <List
      navigationTitle={`${appName} · ${parent.kind ?? "Resource"}/${parentTitle}`}
      searchBarPlaceholder="Filter children..."
    >
      {groups.map((g) => (
        <List.Section key={g.kind} title={g.kind} subtitle={`${g.nodes.length}`}>
          {g.nodes.map((n, i) => (
            <ResourceRow
              key={`${n.uid ?? ""}/${n.namespace ?? ""}/${n.name ?? ""}/${i}`}
              appName={appName}
              node={n}
              fallbackKind={g.kind}
              childIndex={childIndex}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ResourceRow({
  appName,
  node,
  fallbackKind,
  childIndex,
}: {
  appName: string;
  node: ResourceTreeNode;
  fallbackKind: string;
  childIndex: Map<string, ResourceTreeNode[]>;
}) {
  const kind = node.kind ?? fallbackKind;
  const title = node.name ?? "(unnamed)";
  const namespace = node.namespace;
  const health = node.health?.status;
  const info = (node.info ?? []).filter((it) => it.value).slice(0, 2);
  const children = node.uid ? childIndex.get(node.uid) : undefined;
  const childCount = children?.length ?? 0;

  const accessories: List.Item.Accessory[] = [];
  for (const it of info) {
    if (it.value) accessories.push({ tag: it.value, tooltip: it.name });
  }
  if (childCount > 0) {
    accessories.push({ tag: { value: `${childCount}`, color: Color.Blue }, tooltip: `${childCount} children` });
  }
  if (namespace) accessories.push({ tag: namespace });
  if (health) {
    accessories.push({ icon: healthIcon(health) as Image.ImageLike, tooltip: `Health: ${health}` });
  }

  const ref = {
    group: node.group,
    version: node.version,
    kind,
    name: title,
    namespace,
  };

  const viewChildrenAction =
    childCount > 0 ? (
      <Action.Push
        title="View Children"
        icon={Icon.ChevronRight}
        target={<ResourceChildren appName={appName} parent={node} childIndex={childIndex} />}
      />
    ) : null;

  const viewManifestAction = (
    <Action.Push title="View Manifest" icon={Icon.Code} target={<ResourceManifest appName={appName} ref={ref} />} />
  );

  const viewLogsAction =
    kind === "Pod" && namespace ? (
      <Action.Push
        title="View Logs"
        icon={Icon.Text}
        target={<PodContainerPicker appName={appName} podName={title} namespace={namespace} />}
      />
    ) : null;

  return (
    <List.Item
      icon={iconForKind(kind)}
      title={title}
      accessories={accessories}
      actions={
        <ActionPanel>
          {viewChildrenAction}
          {viewLogsAction}
          {viewManifestAction}
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={resourceUrl(appName, ref)}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
          />
          <Action.CopyToClipboard title="Copy Name" content={title} />
          {namespace ? <Action.CopyToClipboard title="Copy Namespace" content={namespace} /> : null}
          {node.health?.message ? (
            <Action.CopyToClipboard title="Copy Health Message" content={node.health.message} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
