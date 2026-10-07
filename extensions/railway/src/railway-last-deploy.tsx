import {
  Clipboard,
  Icon,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { cliCommands } from "./cli";
import {
  RecentDeployment,
  deploymentUrl,
  fetchProjects,
  fetchRecentDeployments,
  hasApiToken,
  railwayWebUrl,
} from "./railway";
import { deploymentTitle, formatRelativeTime, getStatusDisplay, readStarredProjectIds, statusIcon } from "./utils";

// Follow starred projects when there are any, otherwise the most recently updated ones
const maxStarredProjects = 10;
const maxRecentProjects = 5;
const maxDeployments = 10;

// Starred IDs are read here rather than through a hook, so a background refresh has a single loading state
const fetchLastDeploys = async (): Promise<RecentDeployment[]> => {
  const [projects, starredIds] = await Promise.all([fetchProjects(), readStarredProjectIds()]);
  const starred = starredIds.filter((id) => projects.some((p) => p.id === id)).slice(0, maxStarredProjects);
  const projectIds = starred.length ? starred : projects.slice(0, maxRecentProjects).map((p) => p.id);
  return (await fetchRecentDeployments(projectIds)).slice(0, maxDeployments);
};

export default function Command() {
  if (!hasApiToken()) {
    return (
      <MenuBarExtra icon={Icon.Rocket} tooltip="Railway">
        <MenuBarExtra.Item title="Add Railway API Token…" icon={Icon.Key} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }
  return <LastDeployMenu />;
}

function LastDeployMenu() {
  const { showServiceName } = getPreferenceValues<Preferences.RailwayLastDeploy>();
  const { isLoading, data: deployments = [], revalidate } = useCachedPromise(fetchLastDeploys);

  const [last, ...recent] = deployments;
  const lastStatus = last ? getStatusDisplay(last.deployment.status) : undefined;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={last ? statusIcon(last.deployment.status) : Icon.Rocket}
      title={showServiceName && last ? truncate(last.service.name, 20) : undefined}
      tooltip={
        last && lastStatus
          ? `Last deploy: ${last.service.name} · ${lastStatus.label} · ${formatRelativeTime(last.deployment.createdAt)}`
          : "Railway"
      }
    >
      {last ? (
        <MenuBarExtra.Section title="Last Deploy">
          <DeployItem recent={last} />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item title={isLoading ? "Loading…" : "No deployments yet"} />
      )}
      {recent.length > 0 && (
        <MenuBarExtra.Section title="Recent Deploys">
          {recent.map((r) => (
            <DeployItem key={r.deployment.id} recent={r} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Projects"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => launchCommand({ name: "railway-projects", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Railway Dashboard"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(`${railwayWebUrl}/dashboard`)}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function DeployItem({ recent }: { recent: RecentDeployment }) {
  const { deployment, project, environment, service } = recent;
  const status = getStatusDisplay(deployment.status);
  const context = { projectId: project.id, environmentId: environment.id, serviceId: service.id };

  return (
    <MenuBarExtra.Item
      icon={statusIcon(deployment.status)}
      title={service.name}
      subtitle={`${project.name} · ${environment.name} · ${formatRelativeTime(deployment.createdAt)}`}
      tooltip={`${status.label} · ${deploymentTitle(deployment)}`}
      onAction={() => open(deploymentUrl(project.id, service.id, environment.id, deployment.id))}
      alternate={
        <MenuBarExtra.Item
          icon={Icon.Terminal}
          title={`Copy Logs Command for ${service.name}`}
          onAction={async () => {
            await Clipboard.copy(cliCommands.logs(context, { deploymentId: deployment.id }));
            await showHUD("Copied CLI command");
          }}
        />
      }
    />
  );
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
