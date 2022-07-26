import { Icon, Color, List, ActionPanel, useNavigation, Action } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import fromNow from "../../utils/time";
import { Deployment, DeploymentState } from "../../types";
import InspectDeployment from "../inspect-deployment";
import SearchBarAccessory from "../search-projects/search-bar-accessory";
import { FetchHeaders, getFetchDeploymentsURL } from "../../vercel";
import { useFetch } from "@raycast/utils";

const DeploymentsList = ({ projectId }: {
  projectId?: string;
}) => {
  const { user, selectedTeam, teams, updateSelectedTeam } = useVercel();

  const url = getFetchDeploymentsURL(selectedTeam?.id, projectId);

  const { isLoading, data, revalidate } = useFetch<{
    deployments: Deployment[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const deployments = data?.deployments

  const onTeamChange = async (teamIdOrUsername: string) => {
    await updateSelectedTeam(teamIdOrUsername);
    revalidate();
  }

  const { push } = useNavigation();

  return (
    <List
      throttle
      searchBarPlaceholder="Search Deployments..."
      navigationTitle="Results"
      isLoading={isLoading}
      searchBarAccessory={
        <>
          {user && (
            <SearchBarAccessory selectedTeam={selectedTeam} teams={teams || []} user={user} onChange={onTeamChange} />
          )}
        </>
      }
    >
      {deployments?.map((deployment) => (
        <List.Item
          title={`${getCommitMessage(deployment)}`}
          icon={StateIcon(deployment.readyState ? deployment.readyState : deployment.state)}
          subtitle={`${!projectId ? ` ${deployment.name}` : ""}`}
          keywords={[deployment.name, getCommitMessage(deployment) || ""]}
          key={deployment.uid}
          actions={
            <ActionPanel>
              <Action
                title="Show Details"
                icon={Icon.Binoculars}
                onAction={() => {
                  push(<InspectDeployment deployment={deployment} />);
                }}
              />
              <Action.OpenInBrowser title={`Open on Vercel`} url={`https://${deployment.url}`} icon={Icon.Link} />
            </ActionPanel>
          }
          accessories={[
            {
              text: deployment.readyState ? deployment.readyState.toLowerCase() : deployment.state?.toLowerCase(),
            },
            {
              text: deployment.createdAt ? fromNow(deployment.createdAt, new Date()) : "",
              tooltip: deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : "",
            }
          ]}
        />
      ))}
    </List>
  );
};

export default DeploymentsList;


const getCommitMessage = (deployment: Deployment) => {
  // TODO: determine others
  if (deployment.meta.githubCommitMessage) {
    return deployment.meta.githubCommitMessage;
  }
  return "No commit message";
};

const StateIcon = (state?: DeploymentState) => {
  switch (state) {
    case "READY":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "BUILDING":
    case "INITIALIZING":
      return { source: Icon.Dot, tintColor: Color.Blue };
    case "FAILED":
      return { source: Icon.Dot, tintColor: Color.Red };
    case "CANCELED":
      return { source: Icon.Dot, tintColor: Color.PrimaryText };
    case "ERROR":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return Icon.QuestionMark;
  }
};
