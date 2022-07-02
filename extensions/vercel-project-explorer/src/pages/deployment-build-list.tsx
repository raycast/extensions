import { Icon, Color, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fromNow } from "../time";
import { Build, Deployment } from "../types";
import { fetchDeploymentBuildsByDeploymentId } from "../vercel";

type Props = {
  deployment: Deployment;
};

const DeploymentBuildList = ({ deployment }: Props) => {
  const [build, setMostRecentBuild] = useState<Build>();

  useEffect(() => {
    async function fetchBuilds() {
      const fetchedBuilds = await fetchDeploymentBuildsByDeploymentId(deployment.uid);
      setMostRecentBuild(fetchedBuilds ? fetchedBuilds[0] : undefined);
    }
    fetchBuilds();
  }, [deployment]);

  const getCommitMessage = (deployment: Deployment) => {
    // TODO: determine others
    if (deployment.meta.githubCommitMessage) {
      return deployment.meta.githubCommitMessage;
    }
    return "No commit message";
  };

  const getReadyStateIcon = () => {
    switch (build?.readyState) {
      case "READY":
        return { source: Icon.Dot, tintColor: Color.Green };
      case "BUILDING":
      case "INITIALIZING":
        return { source: Icon.Dot, tintColor: Color.Blue };
      case "CANCELED":
        return { source: Icon.Dot, tintColor: Color.PrimaryText };
      case "ERROR":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      default:
        return Icon.QuestionMark;
    }
  };
  const listItems = () => {
    if (!build) return [];
    const items: React.ReactNode[] = [];
    items.push(<List.Item title="State" key="state" subtitle={build.readyState} icon={getReadyStateIcon()} />);
    items.push(<List.Section title="Files" key="file-section" subtitle={build.output.length.toString()} />);
    build.output.forEach((e) => {
      items.push(
        <List.Item
          keywords={[e.type ?? ""]}
          title={e.path}
          subtitle={`${e.type} ${e.lambda ? `— ${e.lambda.deployedTo.join(", ")}` : ""}`}
          icon={e.lambda ? Icon.Globe : Icon.Document}
          key={e.path}
        />
      );
    });

    return items;
  };

  return (
    <List
      navigationTitle={`${getCommitMessage(deployment)} — ${deployment.createdAt ? fromNow(deployment.createdAt) : ""}`}
      isLoading={!build}
    >
      {!build && <List.Item title="No builds found" />}
      {build && listItems()?.map((item) => item)}
      {/* {deployments.map((deployment) => <List.Item title={`${getCommitMessage(deployment)} — ${deployment.createdAt ? dayjs(deployment.createdAt).fromNow() : ''}`}
                icon={StateIcon(deployment.readyState ? deployment.readyState : deployment.state)}
                subtitle={deployment.url}
                accessoryTitle={deployment.readyState ? deployment.readyState.toLowerCase() : deployment.state?.toLowerCase()}
                keywords={[deployment.name, getCommitMessage(deployment) || '']}
                actions={
                    <ActionPanel>
                        <OpenInBrowserAction title={`Open on Vercel`} url={`https://${deployment.url}`} icon={Icon.Link} />
                    </ActionPanel>
                } />)} */}
    </List>
  );
};

export default DeploymentBuildList;
