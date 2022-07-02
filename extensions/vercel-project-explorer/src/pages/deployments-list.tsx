import { Icon, Color, List, ActionPanel, useNavigation, Action } from "@raycast/api";
import { fromNow } from "../time";
import { Deployment, DeploymentState } from "../types";
import DeploymentBuildList from "./deployment-build-list";

type Props = {
  deployments: Deployment[];
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

  return (
    <List navigationTitle="Results" isLoading={deployments.length === 0}>
      {deployments.map((deployment) => (
        <List.Item
          title={`${getCommitMessage(deployment)} — ${deployment.createdAt ? fromNow(deployment.createdAt) : ""}`}
          icon={StateIcon(deployment.readyState ? deployment.readyState : deployment.state)}
          subtitle={deployment.url}
          keywords={[deployment.name, getCommitMessage(deployment) || ""]}
          key={deployment.uid}
          actions={
            <ActionPanel>
              <Action
                title="Inspect Most Recent Build"
                icon={Icon.Binoculars}
                onAction={() => {
                  push(<DeploymentBuildList deployment={deployment} />);
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
