import { Icon, Color, List, ActionPanel, Action } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import fromNow from "../../utils/time";
import { Deployment, DeploymentState, Team } from "../../types";
import InspectDeployment from "../inspect-deployment";
import SearchBarAccessory from "../search-projects/team-switch-search-accessory";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentsURL, parseVercelResponse } from "../../vercel";
import {
  getDeploymentId,
  getCommitDeploymentBranch,
  getCommitMessage,
  isDeploymentCancellable,
  runCancelDeployment,
  CANCEL_DEPLOYMENT_ACTION,
  CANCEL_DEPLOYMENT_SHORTCUT,
} from "../../deployment";
import { getDeploymentOwnerSlug } from "../../utils/deployment-owner";
import { useFetch } from "@raycast/utils";

const DeploymentsList = ({ projectId }: { projectId?: string }) => {
  const { user, teams, selectedTeam } = useVercel();
  const team = teams?.find((team: Team) => team.id === selectedTeam);
  const url = getFetchDeploymentsURL(selectedTeam, projectId, 100, team?.slug);

  const {
    isLoading,
    data: deployments,
    revalidate,
  } = useFetch(url, {
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
  });

  const onTeamChange = () => {
    revalidate();
  };

  return (
    <List
      throttle
      searchBarPlaceholder="Search Deployments..."
      navigationTitle="Results"
      isLoading={isLoading || !user}
      searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}
    >
      {deployments.map((deployment) => {
        const branchName = getCommitDeploymentBranch(deployment);
        return (
          <List.Item
            title={`${getCommitMessage(deployment)}`}
            icon={StateIcon(deployment.readyState ? deployment.readyState : deployment.state)}
            subtitle={`${!projectId ? ` ${deployment.name}` : ""}`}
            keywords={[deployment.name, getCommitMessage(deployment) || "", branchName || ""]}
            key={deployment.uid}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Binoculars}
                  target={<InspectDeployment username={user?.username} deployment={deployment} selectedTeam={team} />}
                />
                <Action.OpenInBrowser title={`Visit in Browser`} url={`https://${deployment.url}`} icon={Icon.Link} />
                {user && (
                  <Action.OpenInBrowser
                    title={`Visit on Vercel`}
                    url={getDeploymentURL(
                      getDeploymentOwnerSlug({ deployment, team, username: user.username }) || user.username,
                      deployment.name,
                      getDeploymentId(deployment),
                    )}
                    icon={Icon.Link}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "opt"], key: "v" },
                      Windows: { modifiers: ["ctrl", "opt"], key: "v" },
                    }}
                  />
                )}
                {isDeploymentCancellable(deployment) && (
                  <Action
                    title={CANCEL_DEPLOYMENT_ACTION.title}
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    shortcut={CANCEL_DEPLOYMENT_SHORTCUT}
                    onAction={() =>
                      runCancelDeployment({
                        deployment,
                        teamId: selectedTeam || undefined,
                        onSuccess: revalidate,
                      })
                    }
                  />
                )}
                <Action.CopyToClipboard
                  title={`Copy URL`}
                  content={`https://${deployment.url}`}
                  icon={Icon.CopyClipboard}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "opt"], key: "c" },
                    Windows: { modifiers: ["ctrl", "opt"], key: "c" },
                  }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                text: branchName,
                icon: branchName ? { source: "boxicon-git-branch.svg", tintColor: Color.SecondaryText } : null,
              },
              {
                text: deployment.createdAt ? fromNow(deployment.createdAt, new Date()) : "",
                tooltip: deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : "",
              },
            ]}
          />
        );
      })}
    </List>
  );
};

export default DeploymentsList;

export const StateIcon = (state?: DeploymentState) => {
  switch (state) {
    case "READY":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "BUILDING":
    case "INITIALIZING":
      return { source: Icon.Dot, tintColor: Color.Orange };
    case "FAILED":
      return { source: Icon.Dot, tintColor: Color.Red };
    case "CANCELED":
      return { source: Icon.Dot, tintColor: Color.PrimaryText };
    case "ERROR":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    case "QUEUED":
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
    default:
      return Icon.QuestionMark;
  }
};
