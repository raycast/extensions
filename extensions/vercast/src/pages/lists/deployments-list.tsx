import { Icon, Color, List, ActionPanel, useNavigation, Action } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import fromNow from "../../utils/time";
import { Deployment, DeploymentState } from "../../types";
import InspectDeployment from "../inspect-deployment";
import SearchBarAccessory from "../search-projects/team-switch-search-accessory";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentsURL } from "../../vercel";
import { useFetch } from "@raycast/utils";

const DeploymentsList = ({ projectId }: { projectId?: string }) => {
  const { user, teams, selectedTeam } = useVercel();
  const url = getFetchDeploymentsURL(selectedTeam, projectId);

  const { isLoading, data, revalidate } = useFetch<{
    deployments: Deployment[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const deployments = data?.deployments;

  const onTeamChange = () => {
    revalidate();
  };

  const { push } = useNavigation();
  const team = teams?.find((team) => team.id === selectedTeam);
  return (
    <List
      throttle
      searchBarPlaceholder="Search Deployments..."
      navigationTitle="Results"
      isLoading={isLoading || !user}
      searchBarAccessory={<>{user && <SearchBarAccessory onTeamChange={onTeamChange} />}</>}
    >
      {deployments?.map((deployment) => {
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
                <Action
                  title="Show Details"
                  icon={Icon.Binoculars}
                  onAction={() => {
                    push(<InspectDeployment username={user?.username} deployment={deployment} selectedTeam={team} />);
                  }}
                />
                <Action.OpenInBrowser title={`Visit in Browser`} url={`https://${deployment.url}`} icon={Icon.Link} />
                {user && (
                  <Action.OpenInBrowser
                    title={`Visit on Vercel`}
                    url={getDeploymentURL(
                      team?.slug || user.username,
                      deployment.name,
                      /* @ts-expect-error Property id does not exist on type Deployment */
                      deployment.id || deployment.uid,
                    )}
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
                  />
                )}
                <Action.CopyToClipboard
                  title={`Copy URL`}
                  content={`https://${deployment.url}`}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
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

const getCommitMessage = (deployment: Deployment) => {
  // TODO: determine others
  if (deployment.meta.githubCommitMessage) {
    return deployment.meta.githubCommitMessage;
  }
  return "No commit message";
};

const getCommitDeploymentBranch = (deployment: Deployment) => {
  // TODO: support other providers beside GitHub
  return deployment.meta.githubCommitRef ?? null;
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
    case "QUEUED":
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
    default:
      return Icon.QuestionMark;
  }
};
