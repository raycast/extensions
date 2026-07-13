import {
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useMemo } from "react";
import { DokployAccount } from "./accounts/types";
import { DokployClient } from "./api/client";
import { runServiceAction } from "./api/dokploy-api";
import { toErrorMessage } from "./api/errors";
import { useAccounts } from "./hooks/use-accounts";
import { useAllDeployments } from "./hooks/use-deployments";
import { AccountProjects, useAllProjects } from "./hooks/use-projects";
import { deploymentHeadline, firstLine, relativeTime } from "./lib/format";
import {
  ACTION_LABELS,
  ACTION_PAST,
  DESTRUCTIVE_ACTIONS,
  hasDeployments,
  ServiceAction,
  serviceKindConfig,
  supportsAction,
} from "./lib/service-kinds";
import { deploymentIcon, deploymentPresentation, statusIcon } from "./lib/status";
import { deploymentsUrl, projectsUrl, serviceUrl } from "./lib/urls";
import { ServiceRef } from "./types/dokploy";
import { DeploymentsLaunchContext } from "./types/launch";

interface Preferences {
  /** Whether the menu bar watches every connected instance or only the active one. */
  menuBarScope?: "all" | "active";
}

const LIFECYCLE_ACTIONS: ServiceAction[] = ["deploy", "redeploy", "rebuild", "start", "stop", "reload"];

/**
 * Service health across every connected Dokploy instance. The icon turns red the moment anything
 * anywhere is in `error`, which is the whole point - you find out without going looking.
 */
export default function MenuBar() {
  const { accounts, activeAccount, isLoading: accountsLoading, hasAccounts } = useAccounts();
  const { menuBarScope = "all" } = getPreferenceValues<Preferences>();

  // The active account is still an account; scoping to it just narrows the list of instances polled.
  const watched = useMemo(
    () => (menuBarScope === "active" ? (activeAccount ? [activeAccount] : []) : accounts),
    [menuBarScope, accounts, activeAccount],
  );

  const { data: accountProjects, isLoading: projectsLoading, revalidate } = useAllProjects(watched);
  const {
    data: deployments,
    isLoading: deploymentsLoading,
    revalidate: revalidateDeployments,
  } = useAllDeployments(watched);

  // Clients are built here, in memory, and never handed to a hook that caches - they hold API keys.
  const clients = useMemo(
    () => new Map(watched.map((account: DokployAccount) => [account.id, new DokployClient(account)])),
    [watched],
  );

  const isLoading = accountsLoading || projectsLoading || deploymentsLoading;
  const showAccountNames = watched.length > 1;

  function refresh() {
    revalidate();
    revalidateDeployments();
  }

  const failing = accountProjects.flatMap((entry) =>
    servicesOf(entry)
      .filter((service) => service.status === "error")
      .map((service) => ({ service, entry })),
  );
  const totalServices = accountProjects.reduce((total, entry) => total + servicesOf(entry).length, 0);
  const building = accountProjects.some((entry) => servicesOf(entry).some((service) => service.status === "running"));
  const unreachable = accountProjects.filter((entry) => entry.error);

  // Also surfaced as the command's subtitle in Raycast's root search.
  useEffect(() => {
    if (isLoading || !hasAccounts) return;
    const summary =
      failing.length > 0
        ? `${failing.length} failing`
        : unreachable.length > 0
          ? `${unreachable.length} unreachable`
          : totalServices > 0
            ? `${totalServices} services healthy`
            : "No services";
    updateCommandMetadata({ subtitle: summary });
  }, [isLoading, hasAccounts, failing.length, unreachable.length, totalServices]);

  if (!isLoading && !hasAccounts) {
    return (
      <MenuBarExtra icon={{ source: Icon.Layers, tintColor: Color.SecondaryText }} tooltip="Dokploy - not connected">
        <MenuBarExtra.Item
          title="Connect a Dokploy Account"
          icon={Icon.Plus}
          onAction={() => launchCommand({ name: "manage-accounts", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  async function perform(client: DokployClient, service: ServiceRef, action: ServiceAction) {
    // A menu-bar submenu is a low-friction surface, and "Stop" sits one slip away from "Start".
    // If the dialog can't be shown the action simply doesn't run, which is the way to fail here.
    if (DESTRUCTIVE_ACTIONS.includes(action)) {
      const confirmed = await confirmAlert({
        title: `${ACTION_LABELS[action]} ${service.name}?`,
        message: `This stops the running service in ${service.projectName}.`,
        primaryAction: { title: ACTION_LABELS[action], style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    try {
      await runServiceAction(client, service, action);
      await showHUD(`${ACTION_PAST[action]} ${service.name}`);
      refresh();
    } catch (error) {
      await showHUD(`⚠️ ${toErrorMessage(error)}`);
    }
  }

  const hasProblem = failing.length > 0 || unreachable.length > 0;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Layers,
        tintColor: hasProblem ? Color.Red : building ? Color.Blue : Color.PrimaryText,
      }}
      // Only take up room in the menu bar when something is actually wrong.
      title={failing.length > 0 ? String(failing.length) : undefined}
      tooltip={
        showAccountNames ? `Dokploy - ${watched.length} accounts` : `Dokploy - ${watched[0]?.label ?? "not connected"}`
      }
    >
      {failing.length > 0 && (
        <MenuBarExtra.Section title="Needs Attention">
          {failing.map(({ service, entry }) => (
            <MenuBarExtra.Item
              key={`${entry.accountId}:${service.kind}:${service.id}`}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              title={service.name}
              // With several instances connected, "which server?" is the first thing you need.
              subtitle={showAccountNames ? `${entry.accountLabel} · ${service.projectName}` : service.projectName}
              onAction={() => openService(clients.get(entry.accountId), service)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {accountProjects.map((entry) => {
        const client = clients.get(entry.accountId);
        const services = servicesOf(entry);

        // An account that failed to load is called out rather than silently missing.
        if (entry.error) {
          return (
            <MenuBarExtra.Section key={entry.accountId} title={entry.accountLabel}>
              <MenuBarExtra.Item
                icon={{ source: Icon.WifiDisabled, tintColor: Color.Red }}
                title="Could not reach this instance"
                subtitle={entry.error}
                onAction={() => launchCommand({ name: "manage-accounts", type: LaunchType.UserInitiated })}
              />
            </MenuBarExtra.Section>
          );
        }

        if (services.length === 0) return null;

        return (
          <MenuBarExtra.Section key={entry.accountId} title={showAccountNames ? entry.accountLabel : undefined}>
            {services.map((service) => (
              <ServiceMenu
                key={`${service.kind}:${service.id}`}
                client={client}
                accountId={entry.accountId}
                service={service}
                // One account: the project is the useful grouping. Several: the project is context.
                subtitle={service.projectName}
                onAction={perform}
              />
            ))}
          </MenuBarExtra.Section>
        );
      })}

      {deployments.length > 0 && (
        <MenuBarExtra.Section title="Recent Deployments">
          {deployments.map((item) => (
            <MenuBarExtra.Item
              key={`${item.accountId}:${item.deploymentId}`}
              icon={deploymentIcon(item.status)}
              // Identity first - which server, which project, which service, and how it went.
              // The account is only worth the space when more than one is being watched.
              title={[
                showAccountNames ? item.accountLabel : undefined,
                item.service.projectName,
                item.service.name,
                deploymentPresentation(item.status).label,
              ]
                .filter(Boolean)
                .join(" · ")}
              // The commit message is the *whole* commit, body included. One line, and no more.
              subtitle={[deploymentHeadline(item.title), relativeTime(item.createdAt)].filter(Boolean).join(" · ")}
              tooltip={item.errorMessage?.trim() || firstLine(item.title) || undefined}
              // Opens that service's build history inside Raycast, not in the browser.
              onAction={() => openDeployments(item.accountId, item.service)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Browse Projects"
          icon={Icon.Folder}
          onAction={() => launchCommand({ name: "projects", type: LaunchType.UserInitiated })}
        />
        {activeAccount && (
          <MenuBarExtra.Item
            title={`Open ${activeAccount.label} Deployments`}
            icon={Icon.Clock}
            onAction={() => open(deploymentsUrl(activeAccount.url))}
          />
        )}
        {activeAccount && (
          <MenuBarExtra.Item
            title={`Open ${activeAccount.label} Dashboard`}
            icon={Icon.Globe}
            onAction={() => open(projectsUrl(activeAccount.url))}
          />
        )}
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function servicesOf(entry: AccountProjects): ServiceRef[] {
  return entry.projects.flatMap((project) => project.environments.flatMap((environment) => environment.services));
}

function openService(client: DokployClient | undefined, service: ServiceRef) {
  if (client) open(serviceUrl(client.webUrl, service));
}

interface ServiceMenuProps {
  client?: DokployClient;
  accountId: string;
  service: ServiceRef;
  subtitle?: string;
  onAction: (client: DokployClient, service: ServiceRef, action: ServiceAction) => void;
}

/**
 * A menu-bar command cannot push a view of its own, so it launches the Deployments command and
 * hands the service over in the launch context.
 */
function openDeployments(accountId: string, service: ServiceRef) {
  const context: DeploymentsLaunchContext = { accountId, service };
  launchCommand({ name: "deployments", type: LaunchType.UserInitiated, context });
}

/** One service, with its build history and lifecycle actions nested behind it. */
function ServiceMenu({ client, accountId, service, subtitle, onAction }: ServiceMenuProps) {
  const config = serviceKindConfig(service.kind);

  return (
    <MenuBarExtra.Submenu
      icon={statusIcon(service.status)}
      title={`${service.name}${subtitle ? ` - ${subtitle}` : ""}`}
    >
      {/* Databases keep no build history, so this would only ever open an empty list. */}
      {hasDeployments(service.kind) && (
        <MenuBarExtra.Item
          title="View Deployments"
          icon={Icon.Clock}
          onAction={() => openDeployments(accountId, service)}
        />
      )}
      <MenuBarExtra.Item
        title="Open in Dokploy"
        icon={{ source: config.icon, tintColor: config.color }}
        onAction={() => openService(client, service)}
      />
      <MenuBarExtra.Section title="Lifecycle">
        {LIFECYCLE_ACTIONS.filter((action) => supportsAction(service.kind, action)).map((action) => (
          <MenuBarExtra.Item
            key={action}
            title={ACTION_LABELS[action]}
            onAction={() => client && onAction(client, service, action)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}
