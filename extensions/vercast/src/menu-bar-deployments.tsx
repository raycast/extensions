import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  Keyboard,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import useVercel from "./hooks/use-vercel-info";
import { useStatusSummary } from "./hooks/use-vercel-status";
import { StateIcon } from "./pages/lists/deployments-list";
import StatusSection from "./pages/menu-bar/status-section";
import { hasOngoingIncident } from "./status/status-page";
import { Deployment, Team } from "./types";
import fromNow from "./utils/time";
import { getDeploymentOwnerSlug } from "./utils/deployment-owner";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentsURL, parseVercelResponse } from "./vercel";

/**
 * Branch, short commit and age. Two deployments of one branch can share name, branch and age, and the
 * menu bar draws one of two identical items indented; the commit tells them apart.
 */
function deploymentSubtitle(deployment: Deployment): string {
  const ref = deployment.meta?.githubCommitRef || deployment.gitSource?.ref;
  const sha = (deployment.meta?.githubCommitSha || deployment.gitSource?.sha)?.slice(0, 7);
  return [ref, sha, fromNow(deployment.createdAt, new Date())].filter(Boolean).join(" • ");
}

export default function MenuBarDeployments() {
  const { user, teams, selectedTeam } = useVercel();
  const { maxDeployments } = getPreferenceValues<Preferences.MenuBarDeployments>();
  const limit = maxDeployments ? parseInt(maxDeployments) : 10;
  const team = teams?.find((t: Team) => t.id === selectedTeam);
  const url = getFetchDeploymentsURL(selectedTeam, undefined, limit, team?.slug);

  const { isLoading, data } = useFetch(url, {
    headers: FetchHeaders,
    // Allow executing when a selectedTeam is stored even if `teams` failed to load.
    execute: Boolean(user && (teams || selectedTeam)),
    parseResponse: parseVercelResponse<{ deployments: Deployment[] }>,
    failureToastOptions: {
      title: "Failed to fetch deployments",
    },
    mapResult(result: { deployments: Deployment[] }) {
      return {
        data: result.deployments,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  // Vercel's public status page needs no token, so it loads even when the deployments cannot.
  // A failure is shown inside the menu (StatusSection), not as a toast.
  const status = useStatusSummary({ silent: true });
  const statusAlert = status.data && hasOngoingIncident(status.data);

  const deployments = data || [];

  return (
    <MenuBarExtra
      isLoading={isLoading || status.isLoading}
      icon={{ source: { light: "vercel-light.svg", dark: "vercel-dark.svg" } }}
      // The logo is an SVG that the menu bar does not tint, so an ongoing issue is flagged with text.
      title={statusAlert ? "⚠︎" : undefined}
      tooltip={status.data ? `Recent Deployments · Vercel: ${status.data.status.description}` : "Recent Deployments"}
    >
      <MenuBarExtra.Section title="Recent Deployments">
        {deployments.length === 0 && !isLoading ? (
          <MenuBarExtra.Item title="No deployments found" />
        ) : (
          deployments.map((deployment) => (
            <MenuBarExtra.Item
              key={deployment.uid}
              title={deployment.name}
              subtitle={deploymentSubtitle(deployment)}
              tooltip={deployment.meta?.githubCommitMessage?.split("\n")[0]}
              icon={StateIcon(deployment.readyState || deployment.state)}
              onAction={() => {
                if (user) {
                  const deploymentUrl = getDeploymentURL(
                    getDeploymentOwnerSlug({ deployment, team, username: user.username }) || user.username,
                    deployment.name,
                    deployment.uid,
                  );
                  open(deploymentUrl);
                } else {
                  open(`https://${deployment.url}`);
                }
              }}
            />
          ))
        )}
      </MenuBarExtra.Section>

      <StatusSection summary={status.data} error={status.error} />

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Settings"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={() => openCommandPreferences()}
        />
        <MenuBarExtra.Item
          title="Open in Raycast"
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              await launchCommand({ name: "search-deployments", type: LaunchType.UserInitiated });
            } catch {
              // command not found
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
