import { Icon, Color, List, ActionPanel, useNavigation, Action } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import { fromNow } from "../../utils/time";
import { Deployment, DeploymentState, Team } from "../../types";
import InspectDeployment from "../inspect-deployment";
import SearchBarAccessory from "../search-projects/search-bar-accessory";

type Props = {
  deployments: Deployment[];
  teams?: Team[];
  selectedTeam?: Team;
};

const DeploymentsList = ({ deployments }: Props) => {
  const { push } = useNavigation();

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

  const getCommitMessage = (deployment: Deployment) => {
    // TODO: determine others
    if (deployment.meta.githubCommitMessage) {
      return deployment.meta.githubCommitMessage;
    }
    return "No commit message";
  };

  const { user, selectedTeam, teams, onTeamChange } = useVercel();

  return (
    <List searchBarPlaceholder="Search Deployments..." navigationTitle="Results" isLoading={!deployments.length}
      searchBarAccessory={<>
        {user && <SearchBarAccessory selectedTeam={selectedTeam} teams={teams || []} user={user} onChange={onTeamChange} />}
      </>}>
      {deployments.map((deployment) => (
        <List.Item
          title={`${getCommitMessage(deployment)} — ${deployment.createdAt ? fromNow(deployment.createdAt) : ""}`}
          icon={StateIcon(deployment.readyState ? deployment.readyState : deployment.state)}
          subtitle={deployment.target || ""}
          keywords={[deployment.name, getCommitMessage(deployment) || ""]}
          key={deployment.uid}
          actions={
            <ActionPanel>
              <Action
                title="Inspect Deployment"
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
          ]}
        />
      ))}
    </List>
  );
};

export default DeploymentsList;
