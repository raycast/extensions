import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { ReactNode } from "react";
import { DokployClient } from "../api/client";
import { runServiceAction } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import {
  ACTION_LABELS,
  ACTION_PAST,
  ACTION_PROGRESS,
  DESTRUCTIVE_ACTIONS,
  hasDeployments,
  ServiceAction,
  serviceKindConfig,
  supportsAction,
} from "../lib/service-kinds";
import { serviceUrl } from "../lib/urls";
import { ServiceRef } from "../types/dokploy";
import { DeploymentList } from "./deployment-list";
import { ServiceLogs } from "./service-logs";

interface ServiceActionsProps {
  client: DokployClient;
  service: ServiceRef;
  /** Called after a mutation so the caller can refresh whatever it is showing. */
  onDidChange: () => void;
  /**
   * Rendered first, above the built-in actions. Lists pass a "Show Details" push here.
   * Taking it as a prop keeps this file from importing the detail view, which would be a cycle.
   */
  primaryAction?: ReactNode;
}

const ACTION_ICONS: Record<ServiceAction, Icon> = {
  deploy: Icon.Rocket,
  redeploy: Icon.ArrowClockwise,
  rebuild: Icon.Hammer,
  start: Icon.Play,
  stop: Icon.Stop,
  reload: Icon.Repeat,
  remove: Icon.Trash,
};

const ACTION_SHORTCUTS: Partial<Record<ServiceAction, Keyboard.Shortcut>> = {
  deploy: { modifiers: ["cmd"], key: "d" },
  // Applications/compose redeploy, databases rebuild - same slot, they never coexist.
  redeploy: { modifiers: ["cmd", "shift"], key: "d" },
  rebuild: { modifiers: ["cmd", "shift"], key: "d" },
  start: { modifiers: ["cmd"], key: "e" },
  stop: { modifiers: ["cmd", "shift"], key: "x" },
  reload: { modifiers: ["cmd", "shift"], key: "r" },
  remove: { modifiers: ["ctrl"], key: "x" },
};

const LIFECYCLE_ORDER: ServiceAction[] = ["deploy", "redeploy", "rebuild", "start", "stop", "reload"];

/**
 * Every lifecycle action for one service. Which actions appear is driven entirely by the
 * service-kind registry, so the eight kinds share this one implementation.
 */
export function ServiceActions({ client, service, onDidChange, primaryAction }: ServiceActionsProps) {
  const config = serviceKindConfig(service.kind);

  async function perform(action: ServiceAction) {
    if (DESTRUCTIVE_ACTIONS.includes(action)) {
      const confirmed = await confirmAlert({
        title: `${ACTION_LABELS[action]} ${service.name}?`,
        message:
          action === "remove"
            ? `This permanently deletes the ${config.label} service from Dokploy.${
                service.kind === "compose" ? " Its volumes are kept." : ""
              }`
            : `This stops the running ${config.label} service.`,
        icon: ACTION_ICONS[action],
        primaryAction: {
          title: ACTION_LABELS[action],
          style: action === "remove" ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${ACTION_PROGRESS[action]} ${service.name}…`,
    });

    try {
      await runServiceAction(client, service, action);
      toast.style = Toast.Style.Success;
      toast.title = `${ACTION_PAST[action]} ${service.name}`;
      // Builds run server-side, so the status in the list only catches up on the next refresh.
      if (action === "deploy" || action === "redeploy" || action === "rebuild") {
        toast.message = "Deployment queued";
      }
      onDidChange();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not ${ACTION_LABELS[action]} ${service.name}`;
      toast.message = toErrorMessage(error);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primaryAction}
        <Action.Push
          title="View Logs"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          target={<ServiceLogs client={client} service={service} />}
        />
        {/* Databases have no build history, so the action would only ever show an empty list. */}
        {hasDeployments(service.kind) && (
          <Action.Push
            title="View Deployments"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            target={<DeploymentList client={client} service={service} />}
          />
        )}
        <Action.OpenInBrowser
          title="Open in Dokploy"
          url={serviceUrl(client.webUrl, service)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Lifecycle">
        {LIFECYCLE_ORDER.filter((action) => supportsAction(service.kind, action)).map((action) => (
          <Action
            key={action}
            title={ACTION_LABELS[action]}
            icon={ACTION_ICONS[action]}
            shortcut={ACTION_SHORTCUTS[action]}
            onAction={() => perform(action)}
          />
        ))}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Service ID" content={service.id} shortcut={Keyboard.Shortcut.Common.Copy} />
        {supportsAction(service.kind, "remove") && (
          <Action
            title={`Delete ${config.label}`}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={ACTION_SHORTCUTS.remove}
            onAction={() => perform("remove")}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
