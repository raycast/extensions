import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import useVercel from "./hooks/use-vercel-info";
import { StateIcon } from "./pages/lists/deployments-list";
import { Deployment, Team } from "./types";
import fromNow from "./utils/time";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentsURL } from "./vercel";

export default function MenuBarDeployments() {
  const { user, teams, selectedTeam } = useVercel();
  const { maxDeployments } = getPreferenceValues<{ maxDeployments?: string }>();
  const limit = maxDeployments ? parseInt(maxDeployments) : 10;
  const url = getFetchDeploymentsURL(selectedTeam, undefined, limit);

  const { isLoading, data } = useFetch(url, {
    headers: FetchHeaders,
    mapResult(result: { deployments: Deployment[] }) {
      return {
        data: result.deployments,
      };
    },
    initialData: [],
    keepPreviousData: true,
  });

  const deployments = data || [];
  const team = teams?.find((t: Team) => t.id === selectedTeam);

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
                    team?.slug || user.username || "",
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
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openCommandPreferences()}
        />
        <MenuBarExtra.Item
          title="Open in Raycast"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
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
