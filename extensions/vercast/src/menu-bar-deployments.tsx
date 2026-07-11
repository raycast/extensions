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
import { StateIcon } from "./pages/lists/deployments-list";
import { Deployment, Team } from "./types";
import fromNow from "./utils/time";
import { getDeploymentOwnerSlug } from "./utils/deployment-owner";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentsURL, parseVercelResponse } from "./vercel";

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

  const deployments = data || [];

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "vercel-light.svg", dark: "vercel-dark.svg" } }}
      tooltip="Recent Deployments"
    >
      <MenuBarExtra.Section title="Recent Deployments">
        {deployments.length === 0 && !isLoading ? (
          <MenuBarExtra.Item title="No deployments found" />
        ) : (
          deployments.map((deployment) => (
            <MenuBarExtra.Item
              key={deployment.uid}
              title={deployment.name}
              subtitle={`${
                deployment.meta?.githubCommitRef || deployment.gitSource?.ref
                  ? `${deployment.meta?.githubCommitRef || deployment.gitSource?.ref} • `
                  : ""
              }${fromNow(deployment.createdAt, new Date())}`}
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
