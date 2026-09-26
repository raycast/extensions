import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { openManageInstances } from "./launch";
import { AuthError } from "../lib/auth/provider";
import { healthSeverity, syncSeverity } from "../lib/model/status";
import { orderResources, resourceNeedsAttention } from "../lib/argocd/project";
import type { AppDetail, AppSummary, ResourceStatus, RevisionMetadata } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { appKey } from "../lib/search/score";
import { DEFAULT_SYNC_FORM, buildSyncRequest } from "../lib/argocd/sync";
import { makeClient } from "./deps";
import { pushRecentKey } from "./storage";
import { environmentColor, healthIcon, phaseIcon, severityColor, syncIcon } from "./statusVisuals";
import { SyncForm } from "./SyncForm";
import { SyncStatus } from "./SyncStatus";
import { AppSetApplications } from "./AppSetApplications";
import { ResourcesList } from "./ResourcesList";
import { ResourceDiffView } from "./ResourceDiffView";

interface Props {
  app: AppSummary;
  instance: ArgoInstance;
  onRefresh: (instanceId?: string) => void;
}

/**
 * Markdown tables are the wrong primitive here. The detail pane is a few hundred pixels wide
 * and Raycast wraps a table cell by breaking the word, so a "Status" header renders one letter
 * per line. Everything below is one fact per line instead.
 */
function resourceLine(resource: ResourceStatus): string {
  const state = [
    resource.status === "" ? "not compared" : resource.status,
    resource.health,
    resource.requiresPruning ? "**needs pruning**" : undefined,
    resource.hook ? "hook" : undefined,
  ]
    .filter(Boolean)
    .join(", ");
  const identity = resource.namespace ? `\`${resource.name}\` in \`${resource.namespace}\`` : `\`${resource.name}\``;
  return `- **${resource.kind || "?"}** ${identity}: ${state}`;
}

function shortRevision(revision: string | undefined): string | undefined {
  if (!revision) {
    return undefined;
  }
  return /^[0-9a-f]{40}$/i.test(revision) ? revision.slice(0, 7) : revision;
}

/**
 * Ordered by what the operator came for. An out-of-sync application raises exactly one
 * question, "out of sync in what way", so the resources that answer it come first and the
 * metadata comes after.
 */
function markdown(
  app: AppSummary,
  detail: AppDetail | undefined,
  revision: RevisionMetadata | undefined,
  error: Error | undefined,
): string {
  const lines = [`# ${app.name}`];

  if (error) {
    // The row the operator came from is still rendered underneath, from the cached summary, so
    // the view degrades to what is known rather than to a stack trace.
    lines.push(
      "",
      `> **Could not load this application.** ${error.message}`,
      "",
      error instanceof AuthError
        ? "Everything below is the last cached state of the row you came from."
        : "Everything below is the last cached state. Refresh to try again.",
    );
  }

  if (detail?.operationMessage) {
    lines.push("", `> ${detail.operationMessage}`);
  }

  for (const condition of detail?.conditions ?? []) {
    lines.push("", `> **${condition.type}**: ${condition.message || "no message"}`);
  }

  const attention = (detail?.resources ?? []).filter(resourceNeedsAttention);
  if (attention.length > 0) {
    const shown = orderResources(attention).slice(0, 15);
    lines.push(
      "",
      `## ${attention.length} resource${attention.length === 1 ? "" : "s"} need attention`,
      "",
      ...shown.map(resourceLine),
    );
    if (attention.length > shown.length) {
      lines.push("", `_and ${attention.length - shown.length} more, in the resources view_`);
    }
  } else if (detail && detail.resourceCounts.total > 0) {
    lines.push("", "## Resources", "", `All ${detail.resourceCounts.total} managed resources are in order.`);
  }

  if (revision?.message || revision?.author) {
    const deployed = shortRevision(detail?.revision ?? app.revision) ?? "unknown";
    lines.push("", "## Deployed commit", "", `- \`${deployed}\``);
    if (revision.author) {
      lines.push(`- by ${revision.author}`);
    }
    if (revision.date) {
      lines.push(`- on ${revision.date}`);
    }
    if (revision.message) {
      lines.push("", `> ${revision.message.split("\n")[0]}`);
    }
  }

  if (detail && detail.history.length > 0) {
    lines.push("", "## Recent deployments", "");
    for (const entry of detail.history) {
      const by = entry.initiatedBy ? ` by ${entry.initiatedBy}` : "";
      lines.push(`- \`${shortRevision(entry.revision) ?? "?"}\` on ${entry.deployedAt ?? "an unknown date"}${by}`);
    }
  }

  const images = detail?.summaryImages ?? [];
  if (images.length > 0) {
    lines.push("", "## Images", "");
    for (const image of images) {
      lines.push(`- \`${image}\``);
    }
  }

  // Only the failures. A "serverside-applied" message on a Synced resource is the sync working
  // as intended, and listing those buried the ones that matter.
  const failures = (detail?.syncResources ?? []).filter(
    (resource) => resource.status === "SyncFailed" || resource.hookPhase === "Failed" || resource.hookPhase === "Error",
  );
  if (failures.length > 0) {
    lines.push("", "## Last sync failures", "");
    for (const resource of failures.slice(0, 15)) {
      lines.push(`- **${resource.kind || "?"}** \`${resource.name}\`: ${resource.message || resource.status}`);
    }
  }

  return lines.join("\n");
}

export function ApplicationDetail({ app, instance, onRefresh }: Props) {
  const { push } = useNavigation();
  const client = makeClient(instance);
  const url = client.appUrl(app.name, app.namespace);

  useEffect(() => {
    void pushRecentKey(appKey(app));
  }, [app]);

  const {
    data: detail,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (name: string, namespace: string) => makeClient(instance).getApplication(name, namespace),
    [app.name, app.namespace],
    // The error is taken and rendered rather than left to surface as a stack trace, which is
    // what an expired session used to produce here while every list view reported it properly.
    { keepPreviousData: true, failureToastOptions: { title: `Could not load ${app.name}` } },
  );

  const current = detail ?? app;

  // One small request for the commit actually deployed. Skipped until the revision is known,
  // and a failure is swallowed: this is context, not something to block the view on.
  const { data: revisionMetadata } = useCachedPromise(
    async (name: string, namespace: string, revision: string | undefined) => {
      if (!revision) {
        return undefined;
      }
      try {
        return await makeClient(instance).getRevisionMetadata(name, namespace, revision);
      } catch {
        return undefined;
      }
    },
    [app.name, app.namespace, current.revision],
    { keepPreviousData: true },
  );

  async function refreshApplication(mode: "normal" | "hard") {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: mode === "hard" ? "Hard refreshing" : "Refreshing",
    });
    try {
      await client.getApplication(app.name, app.namespace, mode);
      await revalidate();
      onRefresh(instance.id);
      toast.style = Toast.Style.Success;
      toast.title = "Refreshed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Refresh failed";
      toast.message = (error as Error).message;
    }
  }

  async function quickSync() {
    const confirmed = await confirmAlert({
      title: `Sync ${app.name}?`,
      message: `On ${instance.name} (${instance.env}), with the application's default sync options.`,
      icon: Icon.ArrowClockwise,
      primaryAction: { title: "Sync", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    try {
      await client.sync(app.name, app.namespace, buildSyncRequest(DEFAULT_SYNC_FORM));
      await showToast({ style: Toast.Style.Success, title: `Sync started for ${app.name}` });
      push(<SyncStatus app={app} instance={instance} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync was refused",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${app.name} on ${instance.name}`}
      markdown={markdown(app, detail, revisionMetadata, error)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Instance">
            <Detail.Metadata.TagList.Item text={instance.name} color={environmentColor(instance.env)} />
            <Detail.Metadata.TagList.Item
              text={instance.allowWrite ? "write enabled" : "read-only"}
              color={instance.allowWrite ? Color.Orange : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Sync" text={current.sync} icon={syncIcon(current.sync)} />
          <Detail.Metadata.Label title="Health" text={current.health} icon={healthIcon(current.health)} />
          {current.phase ? (
            <Detail.Metadata.Label
              title="Last operation"
              text={`${current.phase}${current.finishedAt ? ` at ${current.finishedAt}` : ""}`}
              icon={phaseIcon(current.phase)}
            />
          ) : null}
          {detail ? (
            <Detail.Metadata.TagList title="Sync policy">
              {detail.syncPolicy.automated ? (
                <Detail.Metadata.TagList.Item text="automated" color={Color.Blue} />
              ) : (
                <Detail.Metadata.TagList.Item text="manual" color={Color.SecondaryText} />
              )}
              {detail.syncPolicy.prune ? <Detail.Metadata.TagList.Item text="prune" color={Color.Orange} /> : null}
              {detail.syncPolicy.selfHeal ? (
                <Detail.Metadata.TagList.Item text="self-heal" color={Color.Green} />
              ) : null}
            </Detail.Metadata.TagList>
          ) : null}
          {detail && detail.resourceCounts.total > 0 ? (
            <Detail.Metadata.Label
              title="Resources"
              text={resourceSummary(detail.resourceCounts)}
              icon={{
                source: Icon.Box,
                tintColor:
                  detail.resourceCounts.outOfSync + detail.resourceCounts.degraded > 0 ? Color.Yellow : Color.Green,
              }}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Project" text={current.project} />
          <Detail.Metadata.Label title="Namespace" text={current.namespace} />
          {current.destinationNamespace ? (
            <Detail.Metadata.Label title="Destination namespace" text={current.destinationNamespace} />
          ) : null}
          {current.destinationServer || current.destinationName ? (
            <Detail.Metadata.Label
              title="Destination cluster"
              text={current.destinationName ?? current.destinationServer ?? ""}
            />
          ) : null}
          {current.appSetName ? (
            <Detail.Metadata.Label title="ApplicationSet" text={current.appSetName} icon={Icon.Layers} />
          ) : null}
          <Detail.Metadata.Separator />
          {current.repoUrl ? (
            <Detail.Metadata.Link title="Repository" target={current.repoUrl} text={current.repoUrl} />
          ) : null}
          {current.path ? <Detail.Metadata.Label title="Path" text={current.path} /> : null}
          {current.targetRevision ? (
            <Detail.Metadata.Label title="Target revision" text={current.targetRevision} />
          ) : null}
          {shortRevision(current.revision) ? (
            <Detail.Metadata.Label
              title="Current revision"
              text={shortRevision(current.revision)}
              icon={{ source: Icon.Dot, tintColor: severityColor(syncSeverity(current.sync)) }}
            />
          ) : null}
          {detail?.reconciledAt ? <Detail.Metadata.Label title="Last reconciled" text={detail.reconciledAt} /> : null}
          {detail && detail.syncPolicy.syncOptions.length > 0 ? (
            <Detail.Metadata.Label title="Sync options" text={detail.syncPolicy.syncOptions.join(", ")} />
          ) : null}
          {detail?.lastSyncDeployedAt ? (
            <Detail.Metadata.Label
              title="Last deployed"
              text={`${shortRevision(detail.lastSyncRevision) ?? "unknown"} at ${detail.lastSyncDeployedAt}`}
              icon={{ source: Icon.Clock, tintColor: severityColor(healthSeverity(current.health)) }}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {error instanceof AuthError ? (
              <Action
                title={
                  instance.authMode === "token"
                    ? `Set the API Token for ${instance.name}`
                    : `Sign in to ${instance.name}`
                }
                icon={instance.authMode === "token" ? Icon.Key : Icon.Fingerprint}
                onAction={() => void openManageInstances()}
              />
            ) : null}
            <Action.OpenInBrowser title="Open in ArgoCD" url={url} />
            {detail && detail.resourceCounts.total > 0 ? (
              <Action
                title="Show Resources"
                icon={Icon.Box}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() =>
                  push(
                    <ResourcesList
                      appName={app.name}
                      appNamespace={app.namespace}
                      instance={instance}
                      resources={detail.resources}
                      counts={detail.resourceCounts}
                    />,
                  )
                }
              />
            ) : null}
            {current.sync === "OutOfSync" ? (
              <Action
                title="Show Diff"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() =>
                  push(<ResourceDiffView appName={app.name} appNamespace={app.namespace} instance={instance} />)
                }
              />
            ) : null}
            <Action
              title="Show Sync Status"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => push(<SyncStatus app={app} instance={instance} />)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Refresh">
            <Action
              title="Refresh Application"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => void refreshApplication("normal")}
            />
            <Action
              title="Hard Refresh Application"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => void refreshApplication("hard")}
            />
          </ActionPanel.Section>
          {instance.allowWrite ? (
            <ActionPanel.Section title="Sync">
              <Action
                title="Sync with Options"
                icon={Icon.Gear}
                onAction={() => push(<SyncForm app={app} instance={instance} />)}
              />
              <Action
                title="Quick Sync"
                icon={Icon.ArrowClockwise}
                style={Action.Style.Destructive}
                onAction={() => void quickSync()}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            {current.appSetName ? (
              <Action
                title="Show Sibling Applications"
                icon={Icon.Layers}
                onAction={() =>
                  push(
                    <AppSetApplications
                      instance={instance}
                      namespace={current.namespace}
                      appSetName={current.appSetName ?? ""}
                    />,
                  )
                }
              />
            ) : null}
            <Action.CopyToClipboard title="Copy Application Name" content={app.name} />
            <Action.CopyToClipboard title="Copy ArgoCD URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
            {current.repoUrl ? <Action.OpenInBrowser title="Open Source Repository" url={current.repoUrl} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function resourceSummary(counts: { total: number; outOfSync: number; degraded: number; needsPruning: number }): string {
  const problems = [
    counts.outOfSync > 0 ? `${counts.outOfSync} out of sync` : undefined,
    counts.degraded > 0 ? `${counts.degraded} degraded` : undefined,
    counts.needsPruning > 0 ? `${counts.needsPruning} to prune` : undefined,
  ].filter(Boolean);
  return problems.length === 0 ? `${counts.total}, all in order` : `${counts.total}: ${problems.join(", ")}`;
}
